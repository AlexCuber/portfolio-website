// Converts a phone video into a small web-friendly MP4 (H.264 + AAC, no location metadata).
//
// usage: swift tools/webvideo.swift <input> <output.mp4> <longSidePx> <videoBitsPerSecond> [cropTop cropBottom]
//   cropTop / cropBottom are fractions of the shown height to cut away, e.g. 0.1 0.333
import AVFoundation
import CoreMedia

let args = CommandLine.arguments
guard args.count == 5 || args.count == 7, let longSide = Double(args[3]), let bitrate = Int(args[4]) else {
    print("usage: webvideo.swift input output.mp4 longSidePx videoBitrate [cropTop cropBottom]"); exit(1)
}
let cropTop = args.count == 7 ? Double(args[5]) ?? 0 : 0
let cropBottom = args.count == 7 ? Double(args[6]) ?? 0 : 0
let src = URL(fileURLWithPath: args[1]), dst = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
guard let vTrack = asset.tracks(withMediaType: .video).first else { print("no video"); exit(1) }
// iPhones add a spatial-audio (APAC) track next to the normal AAC one; keep the plain stereo track
let aTrack = asset.tracks(withMediaType: .audio).first { t in
    (t.formatDescriptions as! [CMFormatDescription]).contains { CMFormatDescriptionGetMediaSubType($0) == kAudioFormatMPEG4AAC }
} ?? asset.tracks(withMediaType: .audio).first

// Phone videos are stored sideways and rotated for display by preferredTransform, so the crop
// (given in shown coordinates) is mapped back onto the stored frame before cutting pixels.
let stored = vTrack.naturalSize
let rotation = CGAffineTransform(a: vTrack.preferredTransform.a, b: vTrack.preferredTransform.b,
                                 c: vTrack.preferredTransform.c, d: vTrack.preferredTransform.d, tx: 0, ty: 0)
let shownBox = CGRect(origin: .zero, size: stored).applying(rotation)
let shownW = shownBox.width, shownH = shownBox.height
let keepShown = CGRect(x: 0, y: shownH * cropTop, width: shownW, height: shownH * (1 - cropTop - cropBottom))
let toStored = CGAffineTransform(translationX: shownBox.minX, y: shownBox.minY).concatenating(rotation.inverted())
var keep = keepShown.applying(toStored).standardized.integral.intersection(CGRect(origin: .zero, size: stored))
keep.origin.x = (keep.minX / 2).rounded(.down) * 2; keep.origin.y = (keep.minY / 2).rounded(.down) * 2
keep.size.width = (keep.width / 2).rounded(.down) * 2; keep.size.height = (keep.height / 2).rounded(.down) * 2
let cropX = Int(keep.minX), cropY = Int(keep.minY), cropW = Int(keep.width), cropH = Int(keep.height)

let scale = min(1.0, longSide / Double(max(cropW, cropH)))
let outW = Int((Double(cropW) * scale / 2).rounded()) * 2
let outH = Int((Double(cropH) * scale / 2).rounded()) * 2
let cropped = CGRect(x: 0, y: 0, width: outW, height: outH).applying(rotation)
let outTransform = rotation.concatenating(CGAffineTransform(translationX: -cropped.minX, y: -cropped.minY))

let sdr: [String: Any] = [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
]

let reader = try AVAssetReader(asset: asset)
let vOut = AVAssetReaderTrackOutput(track: vTrack, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    AVVideoColorPropertiesKey: sdr,
])
vOut.alwaysCopiesSampleData = false
reader.add(vOut)
var aOut: AVAssetReaderTrackOutput?
if let aTrack {
    let o = AVAssetReaderTrackOutput(track: aTrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
    reader.add(o); aOut = o
}

let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
writer.metadata = []
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: outW,
    AVVideoHeightKey: outH,
    AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
    AVVideoColorPropertiesKey: sdr,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: 60,
    ] as [String: Any],
])
vIn.transform = outTransform
vIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    kCVPixelBufferWidthKey as String: cropW,
    kCVPixelBufferHeightKey as String: cropH,
])
writer.add(vIn)
var aIn: AVAssetWriterInput?
if aOut != nil {
    let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 44100, AVEncoderBitRateKey: 96000,
    ])
    i.expectsMediaDataInRealTime = false
    writer.add(i); aIn = i
}

guard reader.startReading() else { print("reader failed:", reader.error as Any); exit(1) }
writer.startWriting()
writer.startSession(atSourceTime: .zero)

/// Copies the kept rectangle of a bi-planar 4:2:0 frame (luma plane + interleaved half-size chroma plane).
func crop(_ srcBuf: CVPixelBuffer) -> CVPixelBuffer? {
    var out: CVPixelBuffer?
    guard let pool = adaptor.pixelBufferPool, CVPixelBufferPoolCreatePixelBuffer(nil, pool, &out) == kCVReturnSuccess, let dstBuf = out else { return nil }
    CVPixelBufferLockBaseAddress(srcBuf, .readOnly); CVPixelBufferLockBaseAddress(dstBuf, [])
    defer { CVPixelBufferUnlockBaseAddress(srcBuf, .readOnly); CVPixelBufferUnlockBaseAddress(dstBuf, []) }
    for plane in 0..<2 {
        let sub = plane == 0 ? 1 : 2
        let s = CVPixelBufferGetBaseAddressOfPlane(srcBuf, plane)!, d = CVPixelBufferGetBaseAddressOfPlane(dstBuf, plane)!
        let sStride = CVPixelBufferGetBytesPerRowOfPlane(srcBuf, plane), dStride = CVPixelBufferGetBytesPerRowOfPlane(dstBuf, plane)
        for row in 0..<(cropH / sub) {
            memcpy(d + row * dStride, s + (cropY / sub + row) * sStride + cropX, cropW)
        }
    }
    CVBufferPropagateAttachments(srcBuf, dstBuf)
    return dstBuf
}

let group = DispatchGroup()
group.enter()
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "video")) {
    while vIn.isReadyForMoreMediaData {
        guard let sample = vOut.copyNextSampleBuffer() else { vIn.markAsFinished(); group.leave(); return }
        guard let pixels = CMSampleBufferGetImageBuffer(sample), let part = crop(pixels) else { continue }
        adaptor.append(part, withPresentationTime: CMSampleBufferGetPresentationTimeStamp(sample))
    }
}
if let aOut, let aIn {
    group.enter()
    aIn.requestMediaDataWhenReady(on: DispatchQueue(label: "audio")) {
        while aIn.isReadyForMoreMediaData {
            if let buf = aOut.copyNextSampleBuffer() { aIn.append(buf) }
            else { aIn.markAsFinished(); group.leave(); return }
        }
    }
}
group.wait()

let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { print("failed:", writer.error as Any); exit(1) }
let size = (try FileManager.default.attributesOfItem(atPath: dst.path)[.size] as! NSNumber).intValue
let shownOut = CGRect(x: 0, y: 0, width: outW, height: outH).applying(rotation)
print("ok: \(Int(shownOut.width))x\(Int(shownOut.height)) shown, \(String(format: "%.1f", Double(size) / 1_048_576)) MB, audio: \(aTrack != nil)")
