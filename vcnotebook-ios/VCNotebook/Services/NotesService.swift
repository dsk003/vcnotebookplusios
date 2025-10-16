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
            let fetchedNotes: [Note] = try await supabase.fetchNotes(userId: userId)
            
            DispatchQueue.main.async {
                self.notes = fetchedNotes.sorted { $0.updatedAt > $1.updatedAt }
                self.isLoading = false
            }
            
            Config.log("Fetched \(fetchedNotes.count) notes", type: .success)
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
            Config.log("Error fetching notes: \(error)", type: .error)
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
            
            Config.log("Created note: \(createdNote.id)", type: .success)
            return createdNote
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
            Config.log("Error creating note: \(error)", type: .error)
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
            
            Config.log("Updated note: \(note.id)", type: .success)
            return true
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
            Config.log("Error updating note: \(error)", type: .error)
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
            
            Config.log("Deleted note: \(note.id)", type: .success)
            return true
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
            Config.log("Error deleting note: \(error)", type: .error)
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
            
            Config.log("Found \(searchResults.count) notes matching '\(query)'", type: .success)
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
            Config.log("Error searching notes: \(error)", type: .error)
        }
    }
}

