#!/usr/bin/env python3
"""Resize oversized originals and create gallery copies under public/images-small."""

from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print(
        "Pillow is required. Install it with: "
        "py -m pip install -r requirements-image-optimization.txt",
        file=sys.stderr,
    )
    raise SystemExit(1)


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
DEFAULT_ORIGINAL_MAX_DIMENSION = 2560
DEFAULT_GALLERY_MAX_DIMENSION = 800
DEFAULT_ORIGINAL_JPEG_QUALITY = 88
DEFAULT_GALLERY_JPEG_QUALITY = 76


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def image_dimensions(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        oriented = ImageOps.exif_transpose(image)
        try:
            return oriented.size
        finally:
            oriented.close()


def is_current_gallery_copy(
    source: Path,
    destination: Path,
    max_dimension: int,
) -> bool:
    if not destination.is_file():
        return False

    try:
        source_stat = source.stat()
        destination_stat = destination.stat()
        if destination_stat.st_mtime_ns < source_stat.st_mtime_ns:
            return False
        return max(image_dimensions(destination)) <= max_dimension
    except (OSError, ValueError):
        return False


def write_optimized_image(
    source: Path,
    destination: Path,
    max_dimension: int,
    jpeg_quality: int,
) -> None:
    """Write a resized, optimized image to the destination path."""
    destination.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        try:
            image.thumbnail(
                (max_dimension, max_dimension),
                Image.Resampling.LANCZOS,
            )

            if source.suffix.lower() in {".jpg", ".jpeg"}:
                exif = image.getexif()
                exif.pop(274, None)
                image.convert("RGB").save(
                    destination,
                    format="JPEG",
                    quality=jpeg_quality,
                    optimize=True,
                    progressive=True,
                    exif=exif.tobytes(),
                    icc_profile=image.info.get("icc_profile"),
                )
            else:
                png_image = image
                if image.mode not in {"1", "L", "LA", "RGB", "RGBA"}:
                    png_image = image.convert("RGBA")
                try:
                    png_image.save(
                        destination,
                        format="PNG",
                        optimize=True,
                        compress_level=9,
                        icc_profile=image.info.get("icc_profile"),
                    )
                finally:
                    if png_image is not image:
                        png_image.close()
        finally:
            image.close()


def optimize_original(
    source: Path,
    max_dimension: int,
    jpeg_quality: int,
) -> bool:
    """Downsize an oversized original in place; return whether it was changed."""
    if max(image_dimensions(source)) <= max_dimension:
        return False

    with tempfile.NamedTemporaryFile(
        dir=source.parent,
        suffix=source.suffix,
        delete=False,
    ) as temporary:
        temporary_path = Path(temporary.name)

    try:
        write_optimized_image(
            source,
            temporary_path,
            max_dimension,
            jpeg_quality,
        )
        shutil.copymode(source, temporary_path)
        temporary_path.replace(source)
        return True
    finally:
        temporary_path.unlink(missing_ok=True)


def create_gallery_copy(
    source: Path,
    destination: Path,
    max_dimension: int,
    jpeg_quality: int,
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        dir=destination.parent,
        suffix=destination.suffix,
        delete=False,
    ) as temporary:
        temporary_path = Path(temporary.name)

    try:
        write_optimized_image(
            source,
            temporary_path,
            max_dimension,
            jpeg_quality,
        )
        shutil.copystat(source, temporary_path)
        temporary_path.replace(destination)
    finally:
        temporary_path.unlink(missing_ok=True)


def parse_args() -> argparse.Namespace:
    project_root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description=(
            "Downsize images in public/images to fit a large monitor, then "
            "create 800px gallery copies in public/images-small."
        )
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=project_root / "public" / "images",
        help="Source image folder (default: public/images)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=project_root / "public" / "images-small",
        help="Gallery copy folder (default: public/images-small)",
    )
    parser.add_argument(
        "--original-max-dimension",
        type=int,
        default=DEFAULT_ORIGINAL_MAX_DIMENSION,
        help=(
            "Maximum width or height for originals in pixels; oversized "
            f"originals are replaced (default: {DEFAULT_ORIGINAL_MAX_DIMENSION})"
        ),
    )
    parser.add_argument(
        "--max-dimension",
        type=int,
        default=DEFAULT_GALLERY_MAX_DIMENSION,
        help=(
            "Maximum width or height for gallery copies in pixels "
            f"(default: {DEFAULT_GALLERY_MAX_DIMENSION})"
        ),
    )
    parser.add_argument(
        "--original-jpeg-quality",
        type=int,
        default=DEFAULT_ORIGINAL_JPEG_QUALITY,
        help=(
            "JPEG quality for resized originals, from 1 to 95 "
            f"(default: {DEFAULT_ORIGINAL_JPEG_QUALITY})"
        ),
    )
    parser.add_argument(
        "--jpeg-quality",
        type=int,
        default=DEFAULT_GALLERY_JPEG_QUALITY,
        help=(
            "JPEG quality for gallery copies, from 1 to 95 "
            f"(default: {DEFAULT_GALLERY_JPEG_QUALITY})"
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_root = args.source.resolve()
    output_root = args.output.resolve()

    if not source_root.is_dir():
        print(f"Source folder does not exist: {source_root}", file=sys.stderr)
        return 1
    if args.original_max_dimension < 1 or args.max_dimension < 1:
        print("Image maximum dimensions must be greater than zero.", file=sys.stderr)
        return 2
    if not 1 <= args.original_jpeg_quality <= 95:
        print("--original-jpeg-quality must be between 1 and 95.", file=sys.stderr)
        return 2
    if not 1 <= args.jpeg_quality <= 95:
        print("--jpeg-quality must be between 1 and 95.", file=sys.stderr)
        return 2
    if is_within(output_root, source_root) or is_within(source_root, output_root):
        print(
            "Source and output folders must not contain one another.",
            file=sys.stderr,
        )
        return 2

    sources = sorted(
        path
        for path in source_root.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )
    if not sources:
        print(f"No supported images found under {source_root}.", file=sys.stderr)
        return 1

    original_bytes_before = 0
    original_bytes_after = 0
    gallery_bytes = 0
    originals_resized = 0
    gallery_copies_created = 0
    gallery_copies_reused = 0
    errors: list[str] = []

    for source in sources:
        try:
            original_bytes_before += source.stat().st_size
            originals_resized += int(
                optimize_original(
                    source,
                    args.original_max_dimension,
                    args.original_jpeg_quality,
                )
            )
            original_bytes_after += source.stat().st_size

            destination = output_root / source.relative_to(source_root)
            if is_current_gallery_copy(source, destination, args.max_dimension):
                gallery_copies_reused += 1
            else:
                create_gallery_copy(
                    source,
                    destination,
                    args.max_dimension,
                    args.jpeg_quality,
                )
                gallery_copies_created += 1
            gallery_bytes += destination.stat().st_size
        except (OSError, ValueError) as error:
            errors.append(f"{source}: {error}")

    print(f"Processed: {len(sources) - len(errors)} / {len(sources)}")
    print(f"Oversized originals resized in place: {originals_resized}")
    print(f"Gallery copies created: {gallery_copies_created}")
    print(f"Already optimized gallery copies reused: {gallery_copies_reused}")
    print(f"Original size before: {original_bytes_before / (1024 * 1024):.2f} MiB")
    print(f"Original size after: {original_bytes_after / (1024 * 1024):.2f} MiB")
    print(f"Gallery copy size: {gallery_bytes / (1024 * 1024):.2f} MiB")
    if original_bytes_before:
        reduction = (1 - original_bytes_after / original_bytes_before) * 100
        print(f"Original size reduction: {reduction:.1f}%")
    if errors:
        print("Errors:", file=sys.stderr)
        for error in errors:
            print(f"  {error}", file=sys.stderr)
        return 1
    print(f"Gallery folder: {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
