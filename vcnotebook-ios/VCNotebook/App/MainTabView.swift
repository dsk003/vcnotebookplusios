import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Notes Tab
            NotesListView()
                .tabItem {
                    Label("Notes", systemImage: "note.text")
                }
                .tag(0)
            
            // Search Tab
            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
                .tag(1)
            
            // Settings Tab
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(2)
        }
        .accentColor(.blue)
    }
}

// MARK: - Search View

struct SearchView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @StateObject private var notesService = NotesService()
    @State private var searchText = ""
    @State private var isSearching = false
    
    var body: some View {
        NavigationView {
            VStack {
                if notesService.notes.isEmpty && !isSearching {
                    emptySearchView
                } else if isSearching {
                    ProgressView("Searching...")
                        .padding()
                } else {
                    searchResultsList
                }
            }
            .navigationTitle("Search")
            .searchable(text: $searchText, prompt: "Search your notes")
            .onChange(of: searchText) { newValue in
                Task {
                    await performSearch(query: newValue)
                }
            }
        }
    }
    
    private var emptySearchView: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("Search Your Notes")
                .font(.title2)
                .foregroundColor(.gray)
            
            Text("Enter keywords to find notes")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    private var searchResultsList: some View {
        List(notesService.notes) { note in
            NavigationLink(destination: NoteDetailView(note: note)
                .environmentObject(authManager)
                .environmentObject(notesService)) {
                NoteRowView(note: note)
            }
        }
    }
    
    private func performSearch(query: String) async {
        guard !query.isEmpty else {
            notesService.notes = []
            return
        }
        
        isSearching = true
        await notesService.searchNotes(query: query, userId: authManager.getUserId())
        isSearching = false
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
            .environmentObject(AuthenticationManager())
    }
}

