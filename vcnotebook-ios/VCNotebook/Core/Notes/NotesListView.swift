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

struct NotesListView_Previews: PreviewProvider {
    static var previews: some View {
        NotesListView()
            .environmentObject(AuthenticationManager())
    }
}

