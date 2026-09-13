import UIKit

/// JPEG encoding for photos sent to the API (article OCR, chat photos).
enum ImageUpload {
    /// Vercel caps request bodies at ~4.5 MB and base64 inflates by 4/3, so the
    /// JPEGs must sum to well under that. Try a readable size first, then a
    /// smaller pass before giving up.
    static func encode(_ images: [UIImage], maxBase64Bytes: Int = 3_300_000) -> [Data]? {
        for (side, quality) in [(CGFloat(1600), 0.6), (CGFloat(1200), 0.45)] {
            let jpegs = images.compactMap { $0.downscaled(maxSide: side).jpegData(compressionQuality: quality) }
            guard jpegs.count == images.count else { return nil }
            if jpegs.reduce(0, { $0 + ($1.count * 4 + 2) / 3 }) <= maxBase64Bytes { return jpegs }
        }
        return nil
    }
}

extension UIImage {
    /// Downscale so the longest side is at most `maxSide`. Re-rendering (even
    /// at scale 1) also normalizes HEIC/orientation and strips EXIF.
    func downscaled(maxSide: CGFloat) -> UIImage {
        let longest = max(size.width, size.height)
        let scale = min(1, maxSide / max(longest, 1))
        let target = CGSize(width: size.width * scale, height: size.height * scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
