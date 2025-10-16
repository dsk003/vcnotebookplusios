import SwiftUI

struct NoteDetailView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var notesService: NotesService
    @Environment(\.dismiss) var dismiss
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
                    if await notesService.deleteNote(note) {
                        dismiss()
                    }
                }
            }
        } message: {
            Text("Are you sure you want to delete this note?")
        }
    }
}

struct NoteDetailView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            NoteDetailView(note: Note(title: "Test Note", content: "This is a test note.", userId: "test123"))
                .environmentObject(AuthenticationManager())
                .environmentObject(NotesService())
        }
    }
}

