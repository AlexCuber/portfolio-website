// Cuts the subject out of a photo (same as "Copy Subject" in Photos) and saves it as a transparent PNG,
// cropped to the subject. Used for the mineral shelf: assets/minerals/crystalN.jpg -> crystalN-cut.png
//
// usage: swift tools/cutout.swift <input.jpg> <output.png> [maxSidePx]
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: cutout.swift input.jpg output.png [maxSidePx]"); exit(1) }
let maxSide = args.count > 3 ? CGFloat(Double(args[3]) ?? 520) : 520

let input = CIImage(contentsOf: URL(fileURLWithPath: args[1]), options: [.applyOrientationProperty: true])!
let handler = VNImageRequestHandler(ciImage: input)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first, !result.allInstances.isEmpty else { print("no subject found in", args[1]); exit(1) }

let masked = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
var image = CIImage(cvPixelBuffer: masked)
let scale = min(1, maxSide / max(image.extent.width, image.extent.height))
image = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

let ctx = CIContext()
let cg = ctx.createCGImage(image, from: image.extent.integral, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)!
let rep = NSBitmapImageRep(cgImage: cg)
try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
print("ok:", args[2], "\(cg.width)x\(cg.height)")
