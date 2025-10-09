// Apple Notes Style App with Firebase Authentication and Supabase Integration
class NotesApp {
    constructor() {
        this.firebase = null;
        this.auth = null;
        this.supabase = null;
        this.currentUser = null;
        this.currentNoteId = null;
        this.notes = [];
        this.filteredNotes = [];
        this.isLoading = false;
        this.hasUnsavedChanges = false;
        this.useLocalStorage = false;
        this.searchTerm = '';
        
        this.init();
    }

    async init() {
        await this.setupFirebase();
        this.bindEvents();
        this.setupAuthStateListener();
    }

    async setupFirebase() {
        try {
            // Fetch Firebase configuration from server
            const response = await fetch('/api/firebase-config');
            const config = await response.json();
            
            if (!config.apiKey || !config.authDomain || !config.projectId) {
                console.warn('Firebase configuration not found in environment variables');
                this.showAuthScreen();
                return;
            }

            // Initialize Firebase
            this.firebase = firebase;
            this.firebase.initializeApp(config);
            this.auth = this.firebase.auth();
            
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Error setting up Firebase:', error);
            this.showAuthScreen();
        }
    }

    async setupSupabase() {
        try {
            this.showDebugMessage(`🔍 Debug: Setting up Supabase...`);
            
            // Fetch Supabase configuration from server
            const response = await fetch('/api/config');
            const config = await response.json();
            
            this.showDebugMessage(`🔍 Debug: Supabase config response: ${JSON.stringify(config, null, 2)}`);
            
            const supabaseUrl = config.supabaseUrl;
            const supabaseKey = config.supabaseAnonKey;
            
            if (!supabaseUrl || !supabaseKey) {
                this.showDebugMessage(`❌ Debug: Supabase credentials missing - URL: ${supabaseUrl ? 'Present' : 'Missing'}, Key: ${supabaseKey ? 'Present' : 'Missing'}`);
                console.warn('Supabase credentials not found in environment variables');
                this.useLocalStorage = true;
                return;
            }

            this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
            this.useLocalStorage = false;
            this.showDebugMessage(`✅ Debug: Supabase client initialized successfully`);
            console.log('Supabase client initialized successfully');
        } catch (error) {
            this.showDebugMessage(`❌ Debug: Supabase setup error: ${error.message}`);
            console.error('Error fetching Supabase configuration:', error);
            console.warn('Falling back to localStorage');
            this.useLocalStorage = true;
        }
    }

    setupAuthStateListener() {
        if (!this.auth) return;

        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.setupSupabase();
                this.showApp();
                await this.loadNotes();
                this.updateUserInfo();
            } else {
                this.currentUser = null;
                this.showAuthScreen();
            }
        });
    }

    bindEvents() {
        // Google Sign-In button
        document.getElementById('googleSignInBtn').addEventListener('click', () => {
            this.signInWithGoogle();
        });

        // Sign Out button
        document.getElementById('signOutBtn').addEventListener('click', () => {
            this.signOut();
        });

        // New note button
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            this.createNewNote();
        });

        // Save note button
        document.getElementById('saveNoteBtn').addEventListener('click', () => {
            this.saveCurrentNote();
        });

        // Delete note button
        document.getElementById('deleteNoteBtn').addEventListener('click', () => {
            this.deleteCurrentNote();
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');

        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.trim();
            this.performSearch();
            clearSearchBtn.style.display = this.searchTerm ? 'flex' : 'none';
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            this.performSearch();
            clearSearchBtn.style.display = 'none';
        });

        // Track changes for unsaved indicator
        const titleInput = document.getElementById('noteTitle');
        const contentTextarea = document.getElementById('noteContent');

        titleInput.addEventListener('input', () => {
            this.markAsChanged();
        });

        contentTextarea.addEventListener('input', () => {
            this.markAsChanged();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.createNewNote();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveCurrentNote();
                        break;
                }
            }
        });
    }

    async signInWithGoogle() {
        if (!this.auth) {
            this.showMessage('Firebase not initialized', 'error');
            return;
        }

        try {
            const provider = new this.firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Error signing in with Google:', error);
            this.showMessage('Error signing in. Please try again.', 'error');
        }
    }

    async signOut() {
        if (!this.auth) return;

        try {
            await this.auth.signOut();
            this.showMessage('Signed out successfully', 'success');
        } catch (error) {
            console.error('Error signing out:', error);
            this.showMessage('Error signing out', 'error');
        }
    }

    showAuthScreen() {
        document.getElementById('authContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }

    showApp() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        this.showWelcomeScreen();
    }

    updateUserInfo() {
        if (this.currentUser) {
            const userName = this.currentUser.displayName || this.currentUser.email;
            document.getElementById('userName').textContent = userName;
        }
    }

    async loadNotes() {
        this.showLoading(true);
        this.showDebugMessage(`🔍 Debug: Loading notes for user: ${this.currentUser.uid}`);
        
        try {
            if (this.useLocalStorage) {
                this.showDebugMessage(`🔍 Debug: Loading from localStorage`);
                this.notes = this.loadNotesFromLocalStorage();
                this.showDebugMessage(`🔍 Debug: Loaded ${this.notes.length} notes from localStorage`);
            } else {
                this.showDebugMessage(`🔍 Debug: Loading from Supabase...`);
                const { data, error } = await this.supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', this.currentUser.uid)
                    .order('updated_at', { ascending: false });

                if (error) {
                    this.showDebugMessage(`❌ Debug: Supabase load error: ${JSON.stringify(error, null, 2)}`);
                    throw error;
                }
                
                this.notes = data || [];
                this.showDebugMessage(`✅ Debug: Loaded ${this.notes.length} notes from Supabase`);
                this.showDebugMessage(`🔍 Debug: Notes data: ${JSON.stringify(this.notes, null, 2)}`);
            }
            
            this.filteredNotes = [...this.notes];
            this.renderNotesList();
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showDebugMessage(`❌ Debug: Load notes failed, falling back to localStorage: ${error.message}`);
            this.showMessage('Error loading notes', 'error');
            // Fallback to localStorage
            this.useLocalStorage = true;
            this.notes = this.loadNotesFromLocalStorage();
            this.filteredNotes = [...this.notes];
            this.renderNotesList();
        } finally {
            this.showLoading(false);
        }
    }

    renderNotesList() {
        const notesList = document.getElementById('notesList');
        
        if (this.filteredNotes.length === 0) {
            if (this.searchTerm) {
                notesList.innerHTML = `
                    <div class="no-notes">
                        <p>No notes found</p>
                        <p class="subtitle">Try a different search term</p>
                    </div>
                `;
            } else {
                notesList.innerHTML = `
                    <div class="no-notes">
                        <p>No notes yet</p>
                        <p class="subtitle">Create your first note</p>
                    </div>
                `;
            }
            return;
        }

        notesList.innerHTML = this.filteredNotes.map(note => this.createNoteItemHTML(note)).join('');
        
        // Add click event listeners to note items
        notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                this.selectNote(noteId);
            });
        });
    }

    createNoteItemHTML(note) {
        const date = new Date(note.updated_at || note.created_at);
        const formattedDate = this.formatDate(date);
        const snippet = this.createSnippet(note.content);
        const isActive = note.id === this.currentNoteId ? 'active' : '';

        return `
            <div class="note-item ${isActive}" data-note-id="${note.id}">
                <div class="note-item-title">${this.escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-item-snippet">${this.escapeHtml(snippet)}</div>
                <div class="note-item-date">${formattedDate}</div>
            </div>
        `;
    }

    createSnippet(content) {
        if (!content) return 'No content';
        return content.length > 100 ? content.substring(0, 100) + '...' : content;
    }

    formatDate(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    selectNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNoteId = noteId;
        this.updateActiveNote();
        this.showNoteEditor();
        this.loadNoteContent(note);
    }

    async performSearch() {
        this.showDebugMessage(`🔍 Debug: Performing search for: "${this.searchTerm}"`);
        
        if (!this.searchTerm) {
            // No search term, show all notes
            this.filteredNotes = [...this.notes];
            this.renderNotesList();
            return;
        }

        try {
            if (this.useLocalStorage) {
                // Client-side search for localStorage
                this.filteredNotes = this.notes.filter(note => {
                    const searchLower = this.searchTerm.toLowerCase();
                    return (
                        note.title.toLowerCase().includes(searchLower) ||
                        note.content.toLowerCase().includes(searchLower)
                    );
                });
                this.showDebugMessage(`🔍 Debug: Found ${this.filteredNotes.length} notes in localStorage`);
            } else {
                // Server-side search using Supabase full-text search
                this.showDebugMessage(`🔍 Debug: Using Supabase textSearch...`);
                
                const { data, error } = await this.supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', this.currentUser.uid)
                    .textSearch('title_content_fts', this.searchTerm)
                    .order('updated_at', { ascending: false });

                if (error) {
                    this.showDebugMessage(`❌ Debug: Search error: ${JSON.stringify(error, null, 2)}`);
                    // Fallback to client-side search
                    this.filteredNotes = this.notes.filter(note => {
                        const searchLower = this.searchTerm.toLowerCase();
                        return (
                            note.title.toLowerCase().includes(searchLower) ||
                            note.content.toLowerCase().includes(searchLower)
                        );
                    });
                } else {
                    this.filteredNotes = data || [];
                    this.showDebugMessage(`✅ Debug: Found ${this.filteredNotes.length} notes using Supabase textSearch`);
                }
            }
            
            this.renderNotesList();
        } catch (error) {
            this.showDebugMessage(`❌ Debug: Search failed: ${error.message}`);
            // Fallback to client-side search
            this.filteredNotes = this.notes.filter(note => {
                const searchLower = this.searchTerm.toLowerCase();
                return (
                    note.title.toLowerCase().includes(searchLower) ||
                    note.content.toLowerCase().includes(searchLower)
                );
            });
            this.renderNotesList();
        }
    }

    updateActiveNote() {
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-note-id="${this.currentNoteId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    loadNoteContent(note) {
        document.getElementById('noteTitle').value = note.title || '';
        document.getElementById('noteContent').value = note.content || '';
        document.getElementById('saveNoteBtn').style.display = 'block';
        document.getElementById('deleteNoteBtn').style.display = 'block';
        this.hasUnsavedChanges = false;
        this.updateSaveButtonState();
    }

    showNoteEditor() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('noteForm').style.display = 'flex';
    }

    showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.getElementById('noteForm').style.display = 'none';
        document.getElementById('saveNoteBtn').style.display = 'none';
        document.getElementById('deleteNoteBtn').style.display = 'none';
        this.currentNoteId = null;
        this.hasUnsavedChanges = false;
    }

    createNewNote() {
        this.currentNoteId = null;
        this.showNoteEditor();
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('saveNoteBtn').style.display = 'block';
        document.getElementById('deleteNoteBtn').style.display = 'none';
        this.hasUnsavedChanges = false;
        this.updateSaveButtonState();
        document.getElementById('noteTitle').focus();
    }

    markAsChanged() {
        this.hasUnsavedChanges = true;
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        const saveBtn = document.getElementById('saveNoteBtn');
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        
        // Enable save button only if there are changes and content exists
        if (this.hasUnsavedChanges && (title || content)) {
            saveBtn.disabled = false;
        } else {
            saveBtn.disabled = true;
        }
    }

    async saveCurrentNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title && !content) return;

        const noteData = {
            title: title || 'Untitled',
            content: content,
            user_id: this.currentUser.uid,
            updated_at: new Date().toISOString()
        };

        // Debug logging
        this.showDebugMessage(`🔍 Debug: Starting save process...`);
        this.showDebugMessage(`🔍 Debug: Using localStorage: ${this.useLocalStorage}`);
        this.showDebugMessage(`🔍 Debug: Supabase client: ${this.supabase ? 'Available' : 'Not available'}`);
        this.showDebugMessage(`🔍 Debug: Current user ID: ${this.currentUser.uid}`);
        this.showDebugMessage(`🔍 Debug: Note data: ${JSON.stringify(noteData, null, 2)}`);

        try {
            let savedNote;

            if (this.currentNoteId) {
                // Update existing note
                this.showDebugMessage(`🔍 Debug: Updating existing note with ID: ${this.currentNoteId}`);
                
                if (this.useLocalStorage) {
                    savedNote = this.updateNoteInLocalStorage(this.currentNoteId, noteData);
                    this.showDebugMessage(`🔍 Debug: Updated in localStorage successfully`);
                } else {
                    this.showDebugMessage(`🔍 Debug: Attempting Supabase update...`);
                    const { data, error } = await this.supabase
                        .from('notes')
                        .update(noteData)
                        .eq('id', this.currentNoteId)
                        .eq('user_id', this.currentUser.uid)
                        .select()
                        .single();

                    if (error) {
                        this.showDebugMessage(`❌ Debug: Supabase update error: ${JSON.stringify(error, null, 2)}`);
                        if (error.code === '42501') {
                            this.showDebugMessage(`🔧 Debug: RLS Policy Error - This is a Row Level Security issue. Run the fix-rls-policy.sql script in Supabase.`);
                        }
                        throw error;
                    }
                    
                    savedNote = data;
                    this.showDebugMessage(`✅ Debug: Supabase update successful: ${JSON.stringify(savedNote, null, 2)}`);
                }
            } else {
                // Create new note
                this.showDebugMessage(`🔍 Debug: Creating new note...`);
                noteData.created_at = new Date().toISOString();
                
                if (this.useLocalStorage) {
                    savedNote = this.createNoteInLocalStorage(noteData);
                    this.showDebugMessage(`🔍 Debug: Created in localStorage successfully`);
                } else {
                    this.showDebugMessage(`🔍 Debug: Attempting Supabase insert...`);
                    const { data, error } = await this.supabase
                        .from('notes')
                        .insert([noteData])
                        .select()
                        .single();

                    if (error) {
                        this.showDebugMessage(`❌ Debug: Supabase insert error: ${JSON.stringify(error, null, 2)}`);
                        if (error.code === '42501') {
                            this.showDebugMessage(`🔧 Debug: RLS Policy Error - This is a Row Level Security issue. Run the fix-rls-policy.sql script in Supabase.`);
                        }
                        throw error;
                    }
                    
                    savedNote = data;
                    this.showDebugMessage(`✅ Debug: Supabase insert successful: ${JSON.stringify(savedNote, null, 2)}`);
                }
                
                this.currentNoteId = savedNote.id;
            }

            // Update local notes array
            const noteIndex = this.notes.findIndex(n => n.id === savedNote.id);
            if (noteIndex >= 0) {
                this.notes[noteIndex] = savedNote;
            } else {
                this.notes.unshift(savedNote);
            }

            // Update filtered notes and re-run search if there's a search term
            if (this.searchTerm) {
                this.performSearch();
            } else {
                this.filteredNotes = [...this.notes];
                this.renderNotesList();
            }
            
            this.updateActiveNote();
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.showMessage('Note saved successfully!', 'success');
            this.showDebugMessage(`✅ Debug: Save process completed successfully`);

        } catch (error) {
            console.error('Error saving note:', error);
            this.showDebugMessage(`❌ Debug: Save failed with error: ${error.message || JSON.stringify(error, null, 2)}`);
            this.showMessage(`Error saving note: ${error.message}`, 'error');
        }
    }

    async deleteCurrentNote() {
        if (!this.currentNoteId) return;

        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            if (this.useLocalStorage) {
                this.deleteNoteFromLocalStorage(this.currentNoteId);
            } else {
                const { error } = await this.supabase
                    .from('notes')
                    .delete()
                    .eq('id', this.currentNoteId)
                    .eq('user_id', this.currentUser.uid);

                if (error) throw error;
            }

            // Remove from local array
            this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
            
            // Update filtered notes and re-run search if there's a search term
            if (this.searchTerm) {
                this.performSearch();
            } else {
                this.filteredNotes = [...this.notes];
                this.renderNotesList();
            }
            
            this.showWelcomeScreen();
            this.showMessage('Note deleted', 'success');

        } catch (error) {
            console.error('Error deleting note:', error);
            this.showMessage('Error deleting note', 'error');
        }
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#007aff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(messageEl);

        // Remove message after 3 seconds
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    showDebugMessage(message) {
        // Create debug console area if it doesn't exist
        let debugConsole = document.getElementById('debugConsole');
        if (!debugConsole) {
            debugConsole = document.createElement('div');
            debugConsole.id = 'debugConsole';
            debugConsole.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 400px;
                max-height: 300px;
                background: rgba(0, 0, 0, 0.9);
                color: #00ff00;
                padding: 15px;
                border-radius: 8px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 12px;
                line-height: 1.4;
                overflow-y: auto;
                z-index: 1002;
                border: 1px solid #333;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(debugConsole);
        }

        // Add timestamp and message
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 5px;
            word-wrap: break-word;
            white-space: pre-wrap;
        `;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        debugConsole.appendChild(logEntry);
        
        // Auto-scroll to bottom
        debugConsole.scrollTop = debugConsole.scrollHeight;
        
        // Keep only last 50 messages to prevent memory issues
        const messages = debugConsole.children;
        if (messages.length > 50) {
            debugConsole.removeChild(messages[0]);
        }
        
        // Also log to browser console
        console.log(`[DEBUG] ${message}`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Local Storage fallback methods
    loadNotesFromLocalStorage() {
        try {
            const saved = localStorage.getItem(`notes-app-notes-${this.currentUser.uid}`);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading notes from localStorage:', error);
            return [];
        }
    }

    saveNotesToLocalStorage() {
        try {
            localStorage.setItem(`notes-app-notes-${this.currentUser.uid}`, JSON.stringify(this.notes));
        } catch (error) {
            console.error('Error saving notes to localStorage:', error);
        }
    }

    createNoteInLocalStorage(noteData) {
        const note = {
            id: Date.now().toString(),
            ...noteData
        };
        this.notes.unshift(note);
        this.saveNotesToLocalStorage();
        return note;
    }

    updateNoteInLocalStorage(noteId, noteData) {
        const noteIndex = this.notes.findIndex(n => n.id === noteId);
        if (noteIndex >= 0) {
            this.notes[noteIndex] = { ...this.notes[noteIndex], ...noteData };
            this.saveNotesToLocalStorage();
            return this.notes[noteIndex];
        }
        return null;
    }

    deleteNoteFromLocalStorage(noteId) {
        this.notes = this.notes.filter(n => n.id !== noteId);
        this.saveNotesToLocalStorage();
    }
}

// Add CSS for message animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notesApp = new NotesApp();
    
    console.log('📝 Notes App with Firebase Authentication initialized!');
    console.log('💡 Tip: Use Cmd/Ctrl + N to create a new note, Cmd/Ctrl + S to save');
});