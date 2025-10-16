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

struct NoteEditorView_Previews: PreviewProvider {
    static var previews: some View {
        NoteEditorView(note: nil)
            .environmentObject(AuthenticationManager())
            .environmentObject(NotesService())
    }
}

