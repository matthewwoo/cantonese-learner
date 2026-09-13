import SwiftUI

/// Compact confirmation card shown over the sharing app.
struct ShareSheetView: View {
    let loadURL: () async -> URL?
    let onAdd: (URL) -> Void
    let onCancel: () -> Void

    @State private var url: URL?
    @State private var loaded = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "book")
                    Text("Add to Reads").font(.headline)
                    Spacer()
                    Button("Cancel", action: onCancel).font(.subheadline)
                }
                if !loaded {
                    Label("Reading link…", systemImage: "link").foregroundStyle(.secondary)
                } else if let url {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(url.host() ?? url.absoluteString).font(.subheadline.weight(.medium))
                        Text(url.absoluteString).font(.footnote).foregroundStyle(.secondary).lineLimit(2)
                    }
                    Text("Cantonese Learner will open and fetch the article so you can translate it.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Button { onAdd(url) } label: {
                        Text("Add read").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    Text("No web link was shared. Share a page from Safari or copy its link into a text share.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .padding(20)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .padding(16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.25).ignoresSafeArea().onTapGesture(perform: onCancel))
        .task {
            url = await loadURL()
            loaded = true
        }
    }
}
