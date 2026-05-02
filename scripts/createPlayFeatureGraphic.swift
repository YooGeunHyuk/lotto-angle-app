import AppKit
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let outputURL = root.appendingPathComponent("store-assets/play-feature-graphic.png")
let screenshotURL = root.appendingPathComponent("store-assets/feature-source-home.png")
let fontURL = root.appendingPathComponent("assets/fonts/Jua-Regular.ttf")

try FileManager.default.createDirectory(
  at: outputURL.deletingLastPathComponent(),
  withIntermediateDirectories: true
)

CTFontManagerRegisterFontsForURL(fontURL as CFURL, .process, nil)

let width = 1024
let height = 500
let image = NSImage(size: NSSize(width: width, height: height))

func color(_ hex: UInt32) -> NSColor {
  NSColor(
    red: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: 1
  )
}

func drawBall(_ number: String, x: CGFloat, y: CGFloat, size: CGFloat, fill: NSColor, text: NSColor = .white) {
  let rect = CGRect(x: x, y: y, width: size, height: size)
  fill.setFill()
  NSBezierPath(ovalIn: rect).fill()

  NSColor.white.withAlphaComponent(0.22).setFill()
  NSBezierPath(ovalIn: CGRect(x: x + size * 0.15, y: y + size * 0.58, width: size * 0.32, height: size * 0.24)).fill()

  let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: size * 0.36, weight: .heavy),
    .foregroundColor: text
  ]
  let textSize = number.size(withAttributes: attrs)
  number.draw(
    at: CGPoint(x: x + (size - textSize.width) / 2, y: y + (size - textSize.height) / 2 - 1),
    withAttributes: attrs
  )
}

func drawText(_ text: String, x: CGFloat, y: CGFloat, size: CGFloat, weight: NSFont.Weight, color fill: NSColor, fontName: String? = nil) {
  let font = fontName.flatMap { NSFont(name: $0, size: size) } ?? NSFont.systemFont(ofSize: size, weight: weight)
  let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: fill
  ]
  text.draw(at: CGPoint(x: x, y: y), withAttributes: attrs)
}

image.lockFocus()
NSGraphicsContext.current?.imageInterpolation = .high

let cream = color(0xfffbef)
cream.setFill()
CGRect(x: 0, y: 0, width: width, height: height).fill()

color(0xf5e9c6).withAlphaComponent(0.35).setFill()
NSBezierPath(rect: CGRect(x: 34, y: 340, width: 210, height: 58)).fill()
NSBezierPath(rect: CGRect(x: 54, y: 150, width: 514, height: 64)).fill()
NSBezierPath(rect: CGRect(x: 468, y: 100, width: 74, height: 128)).fill()
NSBezierPath(rect: CGRect(x: 650, y: 152, width: 76, height: 128)).fill()

drawText("고정번호 · 합계조건 · 최신 회차 반영", x: 76, y: 338, size: 25, weight: .bold, color: color(0x777777))
drawText("번호 추천부터 통계 분석까지", x: 76, y: 286, size: 36, weight: .heavy, color: color(0x1a1a1a))
drawText("로또될각", x: 76, y: 134, size: 93, weight: .regular, color: color(0xd94f2a), fontName: "Jua-Regular")

if let screenshot = NSImage(contentsOf: screenshotURL) {
  let phoneClip = CGRect(x: 586, y: 54, width: 364, height: 414)
  let phonePath = NSBezierPath(roundedRect: phoneClip, xRadius: 36, yRadius: 36)

  let shadow = NSShadow()
  shadow.shadowColor = NSColor.black.withAlphaComponent(0.12)
  shadow.shadowBlurRadius = 16
  shadow.shadowOffset = NSSize(width: 0, height: -3)
  NSGraphicsContext.saveGraphicsState()
  shadow.set()
  NSColor.white.setFill()
  phonePath.fill()
  NSGraphicsContext.restoreGraphicsState()

  NSGraphicsContext.saveGraphicsState()
  phonePath.addClip()

  let imageSize = screenshot.size
  let scaledHeight = phoneClip.width * imageSize.height / imageSize.width
  let imageRect = CGRect(
    x: phoneClip.minX,
    y: phoneClip.maxY - scaledHeight,
    width: phoneClip.width,
    height: scaledHeight
  )
  screenshot.draw(in: imageRect, from: .zero, operation: .sourceOver, fraction: 1)

  for i in 0...190 {
    let progress = CGFloat(i) / 190
    cream.withAlphaComponent(progress * progress * 0.98).setFill()
    CGRect(x: phoneClip.minX, y: phoneClip.minY + CGFloat(i), width: phoneClip.width, height: 1).fill()
  }

  NSGraphicsContext.restoreGraphicsState()

  color(0xe8e8e8).setStroke()
  phonePath.lineWidth = 1.5
  phonePath.stroke()
}

image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let pngData = bitmap.representation(using: .png, properties: [:])
else {
  fatalError("Unable to render feature graphic")
}

try pngData.write(to: outputURL)
print(outputURL.path)
