# iOS Notes Implementation Guide

## 📝 Overview

This guide shows how to implement the notes feature in your iOS app, using the same Supabase backend as your web app.

## 🏗️ Data Flow

```
iOS App → Supabase Database → Web App
   ↓                              ↓
Notes sync in real-time
```

Both platforms share the same database tables:
- `notes` - Note title, content, timestamps
- `file_attachments` - Files attached to notes
- `user_subscriptions` - Premium status

## 💻 Models

### Note.swift

```swift
import Foundation

struct Note: Identifiable, Codable {
    let id: String
    var title: String
    var content: String
    let userId: String
    let createdAt: Date
    var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case content
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    // For creating new notes
    init(title: String, content: String, userId: String) {
        self.id = UUID().uuidString
        self.title = title
        self.content = content
        self.userId = userId
        self.createdAt = Date()
        self.updatedAt = Date()
    }
    
    // For decoding from Supabase
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        content = try container.decode(String.self, forKey: .content)
        userId = try container.decode(String.self, forKey: .userId)
        
        // Handle ISO8601 date format from Supabase
        let createdAtString = try container.decode(String.self, forKey: .createdAt)
        let updatedAtString = try container.decode(String.self, forKey: .updatedAt)
        
        let formatter = ISO8601DateFormatter()
        createdAt = formatter.date(from: createdAtString) ?? Date()
        updatedAt = formatter.date(from: updatedAtString) ?? Date()
    }
}

extension Note {
    var formattedDate: String {
        let calendar = Calendar.current
        let now = Date()
        
        if calendar.isDateInToday(updatedAt) {
            return "Today"
        } else if calendar.isDateInYesterday(updatedAt) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: updatedAt)
        }
    }
    
    var snippet: String {
        if content.isEmpty {
            return "No content"
        }
        return String(content.prefix(100))
    }
}
```

### FileAttachment.swift

```swift
import Foundation

struct FileAttachment: Identifiable, Codable {
    let id: String
    let noteId: String
    let userId: String
    let fileName: String
    let fileSize: Int
    let fileType: String
    let storagePath: String
    let storageBucket: String
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case noteId = "note_id"
        case userId = "user_id"
        case fileName = "file_name"
        case fileSize = "file_size"
        case fileType = "file_type"
        case storagePath = "storage_path"
        case storageBucket = "storage_bucket"
        case createdAt = "created_at"
    }
    
    var formattedFileSize: String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(fileSize))
    }
    
    var isImage: Bool {
        let imageTypes = ["image/jpeg", "image/png", "image/gif", "image/heic"]
        return imageTypes.contains(fileType)
    }
    
    var isVideo: Bool {
        let videoTypes = ["video/mp4", "video/quicktime", "video/mov"]
        return videoTypes.contains(fileType)
    }
}
```

## 💻 Services

### NotesService.swift

```swift
import Foundation
import Combine

class NotesService: ObservableObject {
    @Published var notes: [Note] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let supabase = SupabaseService.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Fetch Notes
    
    func fetchNotes(for userId: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let notes: [Note] = try await supabase.fetchNotes(userId: userId)
            
            DispatchQueue.main.async {
                self.notes = notes.sorted { $0.updatedAt > $1.updatedAt }
                self.isLoading = false
            }
            
            print("✅ Fetched \(notes.count) notes")
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
            print("❌ Error fetching notes: \(error)")
        }
    }
    
    // MARK: - Create Note
    
    func createNote(title: String, content: String, userId: String) async -> Note? {
        do {
            let note = Note(title: title.isEmpty ? "Untitled" : title,
                           content: content,
                           userId: userId)
            
            let createdNote: Note = try await supabase.createNote(note)
            
            DispatchQueue.main.async {
                self.notes.insert(createdNote, at: 0)
            }
            
            print("✅ Created note: \(createdNote.id)")
            return createdNote
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
            print("❌ Error creating note: \(error)")
            return nil
        }
    }
    
    // MARK: - Update Note
    
    func updateNote(_ note: Note) async -> Bool {
        do {
            let updatedNote: Note = try await supabase.updateNote(note)
            
            DispatchQueue.main.async {
                if let index = self.notes.firstIndex(where: { $0.id == note.id }) {
                    self.notes[index] = updatedNote
                }
            }
            
            print("✅ Updated note: \(note.id)")
            return true
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
            print("❌ Error updating note: \(error)")
            return false
        }
    }
    
    // MARK: - Delete Note
    
    func deleteNote(_ note: Note) async -> Bool {
        do {
            try await supabase.deleteNote(noteId: note.id, userId: note.userId)
            
            DispatchQueue.main.async {
                self.notes.removeAll { $0.id == note.id }
            }
            
            print("✅ Deleted note: \(note.id)")
            return true
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
            print("❌ Error deleting note: \(error)")
            return false
        }
    }
    
    // MARK: - Search Notes
    
    func searchNotes(query: String, userId: String) async {
        if query.isEmpty {
            await fetchNotes(for: userId)
            return
        }
        
        isLoading = true
        
        do {
            let searchResults: [Note] = try await supabase.searchNotes(query: query, userId: userId)
            
            DispatchQueue.main.async {
                self.notes = searchResults.sorted { $0.updatedAt > $1.updatedAt }
                self.isLoading = false
            }
            
            print("✅ Found \(searchResults.count) notes matching '\(query)'")
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
            print("❌ Error searching notes: \(error)")
        }
    }
}
```

## 💻 Views

### NotesListView.swift

```swift
import SwiftUI

struct NotesListView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @StateObject private var notesService = NotesService()
    @State private var searchText = ""
    @State private var showingNewNote = false
    
    var filteredNotes: [Note] {
        if searchText.isEmpty {
            return notesService.notes
        } else {
            return notesService.notes.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.content.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if notesService.isLoading {
                    ProgressView("Loading notes...")
                } else if filteredNotes.isEmpty {
                    emptyStateView
                } else {
                    notesList
                }
            }
            .navigationTitle("Notes")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewNote = true }) {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search notes")
            .sheet(isPresented: $showingNewNote) {
                NoteEditorView(note: nil)
                    .environmentObject(authManager)
                    .environmentObject(notesService)
            }
            .task {
                await notesService.fetchNotes(for: authManager.getUserId())
            }
        }
    }
    
    private var notesList: some View {
        List {
            ForEach(filteredNotes) { note in
                NavigationLink(destination: NoteDetailView(note: note)
                    .environmentObject(authManager)
                    .environmentObject(notesService)) {
                    NoteRowView(note: note)
                }
            }
            .onDelete { indexSet in
                Task {
                    for index in indexSet {
                        let note = filteredNotes[index]
                        await notesService.deleteNote(note)
                    }
                }
            }
        }
        .refreshable {
            await notesService.fetchNotes(for: authManager.getUserId())
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "note.text")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text(searchText.isEmpty ? "No notes yet" : "No notes found")
                .font(.title2)
                .foregroundColor(.gray)
            
            Text(searchText.isEmpty ? "Tap + to create your first note" : "Try a different search term")
                .font(.subheadline)
                .foregroundColor(.gray)
            
            if searchText.isEmpty {
                Button("Create Note") {
                    showingNewNote = true
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}
```

### NoteRowView.swift

```swift
import SwiftUI

struct NoteRowView: View {
    let note: Note
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(note.title.isEmpty ? "Untitled" : note.title)
                .font(.headline)
                .lineLimit(1)
            
            Text(note.snippet)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            Text(note.formattedDate)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}
```

### NoteEditorView.swift

```swift
import SwiftUI

struct NoteEditorView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var notesService: NotesService
    
    let note: Note?
    
    @State private var title: String
    @State private var content: String
    @State private var isSaving = false
    
    init(note: Note?) {
        self.note = note
        _title = State(initialValue: note?.title ?? "")
        _content = State(initialValue: note?.content ?? "")
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                TextField("Title", text: $title)
                    .font(.title2)
                    .padding()
                
                Divider()
                
                TextEditor(text: $content)
                    .padding()
            }
            .navigationTitle(note == nil ? "New Note" : "Edit Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task {
                            await saveNote()
                        }
                    }
                    .disabled(isSaving || (title.isEmpty && content.isEmpty))
                }
            }
        }
    }
    
    private func saveNote() async {
        isSaving = true
        
        if let existingNote = note {
            // Update existing note
            var updatedNote = existingNote
            updatedNote.title = title
            updatedNote.content = content
            updatedNote.updatedAt = Date()
            
            if await notesService.updateNote(updatedNote) {
                dismiss()
            }
        } else {
            // Create new note
            if await notesService.createNote(
                title: title,
                content: content,
                userId: authManager.getUserId()
            ) != nil {
                dismiss()
            }
        }
        
        isSaving = false
    }
}
```

### NoteDetailView.swift

```swift
import SwiftUI

struct NoteDetailView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var notesService: NotesService
    @State private var showingEditor = false
    @State private var showingDeleteAlert = false
    
    let note: Note
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(note.title.isEmpty ? "Untitled" : note.title)
                    .font(.title)
                    .bold()
                
                Text(note.formattedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Divider()
                
                Text(note.content)
                    .font(.body)
                
                Spacer()
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button(action: { showingEditor = true }) {
                        Label("Edit", systemImage: "pencil")
                    }
                    
                    Button(role: .destructive, action: { showingDeleteAlert = true }) {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showingEditor) {
            NoteEditorView(note: note)
                .environmentObject(authManager)
                .environmentObject(notesService)
        }
        .alert("Delete Note", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                Task {
                    await notesService.deleteNote(note)
                }
            }
        } message: {
            Text("Are you sure you want to delete this note?")
        }
    }
}
```

## 🔄 Real-time Sync

To enable real-time sync between web and iOS:

```swift
// Add to NotesService
func subscribeToNoteChanges(userId: String) {
    // Use Supabase Realtime subscriptions
    supabase.subscribeToNotes(userId: userId) { [weak self] change in
        DispatchQueue.main.async {
            switch change {
            case .insert(let note):
                self?.notes.insert(note, at: 0)
            case .update(let note):
                if let index = self?.notes.firstIndex(where: { $0.id == note.id }) {
                    self?.notes[index] = note
                }
            case .delete(let noteId):
                self?.notes.removeAll { $0.id == noteId }
            }
        }
    }
}
```

## 🧪 Testing

Test these scenarios:
- [ ] Create note on iOS → Appears on web
- [ ] Create note on web → Appears on iOS
- [ ] Edit note on either platform → Syncs
- [ ] Delete note on either platform → Syncs
- [ ] Search works correctly
- [ ] Pull to refresh works
- [ ] Swipe to delete works
- [ ] Empty state shows correctly

## 🚀 Performance Tips

1. **Pagination** - Load notes in batches
2. **Caching** - Cache notes locally for offline access
3. **Optimistic Updates** - Update UI immediately, sync later
4. **Background Sync** - Sync when app comes to foreground

## 📱 iOS-Specific Features

Consider adding:
- **Widgets** - Show recent notes on home screen
- **Shortcuts** - Create note via Siri
- **Handoff** - Continue editing on Mac
- **Today Extension** - Quick note creation
- **Share Extension** - Save from other apps

---

**Next:** Add file attachments (see IOS_FILE_UPLOAD_GUIDE.md) 📎

