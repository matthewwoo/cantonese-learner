import Foundation

// Compile with Core/Models.swift to verify the actual native decoding model.
let decoder = JSONDecoder()
let legacy = try decoder.decode([ArticleSourcePage].self, from: Data(#"["First line","Second line"]"#.utf8))
precondition(legacy.map(\.text) == ["First line", "Second line"])
precondition(legacy.allSatisfy { $0.image == nil })
let photoJSON = #"[{"text":"Little you\nlittle wonder","image":"data:image/jpeg;base64,/9j/2Q=="},{"text":"","image":"data:image/jpeg;base64,/9j/2Q=="}]"#
let photographed = try decoder.decode([ArticleSourcePage].self, from: Data(photoJSON.utf8))
precondition(photographed.count == 2 && photographed[0].text == "Little you\nlittle wonder")
precondition(photographed[1].text.isEmpty && photographed[1].image != nil)
let roundTrip = try decoder.decode([ArticleSourcePage].self, from: JSONEncoder().encode(photographed))
precondition(roundTrip.map(\.text) == photographed.map(\.text))
precondition(roundTrip.map(\.image) == photographed.map(\.image))
let article = ArticleDetail(id: UUID(), title: "Book", sourceURL: nil, status: .ready,
                            errorMessage: nil, createdAt: Date(), originalContent: photographed.map(\.text),
                            translatedContent: ["小小嘅你\n小小嘅奇蹟", ""], wordDefinitions: [:], sourcePages: photographed)
precondition(article.isPhotoBook)
print("Native legacy/page decoding, blank page alignment, and image round-trip passed.")
