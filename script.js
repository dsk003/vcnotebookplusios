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
        this.fileAttachments = [];
        this.tempFileAttachments = []; // Store files for unsaved notes
        
        this.init();
    }

    // Google Analytics tracking methods
    trackEvent(eventName, parameters = {}) {
        if (typeof gtag !== 'undefined' && window.gtag) {
            gtag('event', eventName, parameters);
        } else {
            console.log('GA Event (not tracked):', eventName, parameters);
        }
    }

    trackPageView(pageName) {
        if (typeof gtag !== 'undefined' && window.gtag) {
            // Get the measurement ID from the server config
            this.getGAMeasurementId().then(measurementId => {
                if (measurementId) {
                    gtag('config', measurementId, {
                        page_title: pageName,
                        page_location: window.location.href
                    });
                }
            });
        } else {
            console.log('GA Page View (not tracked):', pageName);
        }
    }

    trackUserAction(action, category = 'User Interaction', label = '') {
        this.trackEvent(action, {
            event_category: category,
            event_label: label,
            value: 1
        });
    }

    // Helper method to get GA measurement ID
    async getGAMeasurementId() {
        try {
            const response = await fetch('/api/ga-config');
            const config = await response.json();
            return config.measurementId;
        } catch (error) {
            console.error('Error fetching GA config:', error);
            return null;
        }
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
            const supabaseServiceKey = config.supabaseServiceKey;
            
            if (!supabaseUrl || !supabaseKey) {
                this.showDebugMessage(`❌ Debug: Supabase credentials missing - URL: ${supabaseUrl ? 'Present' : 'Missing'}, Key: ${supabaseKey ? 'Present' : 'Missing'}`);
                console.warn('Supabase credentials not found in environment variables');
                this.useLocalStorage = true;
                return;
            }

            // Create regular client for database operations
            this.supabase = supabase.createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            // Create service role client for storage operations
            if (supabaseServiceKey) {
                this.supabaseStorage = supabase.createClient(supabaseUrl, supabaseServiceKey, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                });
                this.showDebugMessage(`✅ Debug: Service role client created for storage operations`);
            } else {
                this.showDebugMessage(`⚠️ Debug: No service role key found, using regular client for storage`);
                this.supabaseStorage = this.supabase;
            }
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

    async setupSupabaseAuth() {
        if (!this.supabase || !this.currentUser) return;

        try {
            this.showDebugMessage(`🔍 Debug: Setting up Supabase auth for Firebase user: ${this.currentUser.uid}`);
            
            // Get Firebase ID token
            const idToken = await this.currentUser.getIdToken();
            this.showDebugMessage(`🔍 Debug: Got Firebase ID token: ${idToken ? 'Yes' : 'No'}`);
            
            // Set the session for Supabase using Firebase token
            const { data, error } = await this.supabase.auth.setSession({
                access_token: idToken,
                refresh_token: idToken // Using same token for refresh
            });

            if (error) {
                this.showDebugMessage(`❌ Debug: Supabase auth setup error: ${JSON.stringify(error, null, 2)}`);
                // Continue anyway - we'll handle auth differently
            } else {
                this.showDebugMessage(`✅ Debug: Supabase auth session set successfully`);
            }

        } catch (error) {
            this.showDebugMessage(`❌ Debug: Firebase token error: ${error.message}`);
            // Continue anyway - we'll use a different approach
        }
    }

    setupAuthStateListener() {
        if (!this.auth) return;

        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.setupSupabase();
                await this.setupSupabaseAuth();
                this.showApp();
                await this.loadNotes();
                this.updateUserInfo();
                this.checkUserSubscriptionStatus(); // Check subscription status
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

        // Upload file button
        document.getElementById('uploadFileBtn').addEventListener('click', () => {
            this.trackUserAction('file_upload_initiated', 'File Upload', 'Button Click');
            document.getElementById('fileInput').click();
        });

        // File input change
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Buy Premium button
        document.getElementById('buyPremiumBtn').addEventListener('click', () => {
            this.trackUserAction('premium_upgrade_clicked', 'Premium', 'Upgrade Button');
            this.handleUpgradeToPremium();
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');

        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.trim();
            if (this.searchTerm) {
                this.trackUserAction('search_performed', 'Search', this.searchTerm);
            }
            this.performSearch();
            clearSearchBtn.style.display = this.searchTerm ? 'flex' : 'none';
        });

        clearSearchBtn.addEventListener('click', () => {
            this.trackUserAction('search_cleared', 'Search', 'Clear');
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
            this.trackUserAction('sign_in_attempt', 'Authentication', 'Google');
            const provider = new this.firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
            this.trackUserAction('sign_in_success', 'Authentication', 'Google');
        } catch (error) {
            console.error('Error signing in with Google:', error);
            this.trackUserAction('sign_in_error', 'Authentication', 'Google');
            this.showMessage('Error signing in. Please try again.', 'error');
        }
    }

    async signOut() {
        if (!this.auth) return;

        try {
            this.trackUserAction('sign_out_attempt', 'Authentication', 'Google');
            await this.auth.signOut();
            this.trackUserAction('sign_out_success', 'Authentication', 'Google');
            this.showMessage('Signed out successfully', 'success');
        } catch (error) {
            console.error('Error signing out:', error);
            this.trackUserAction('sign_out_error', 'Authentication', 'Google');
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
        
        // Track app access
        this.trackUserAction('app_accessed', 'App', 'Main Interface');
        this.trackPageView('Notes App - Main Interface');
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

    async loadNoteContent(note) {
        document.getElementById('noteTitle').value = note.title || '';
        document.getElementById('noteContent').value = note.content || '';
        document.getElementById('saveNoteBtn').style.display = 'block';
        document.getElementById('deleteNoteBtn').style.display = 'block';
        document.getElementById('uploadFileBtn').style.display = 'block';
        this.hasUnsavedChanges = false;
        this.updateSaveButtonState();
        
        // Clear temporary files when loading a saved note
        this.tempFileAttachments = [];
        
        // Load file attachments for this note
        await this.loadFileAttachments();
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
        document.getElementById('uploadFileBtn').style.display = 'none';
        this.currentNoteId = null;
        this.hasUnsavedChanges = false;
        
        // Hide file attachments section
        document.getElementById('fileAttachments').style.display = 'none';
    }

    createNewNote() {
        this.trackUserAction('note_created', 'Notes', 'New Note');
        this.currentNoteId = null;
        this.showNoteEditor();
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('saveNoteBtn').style.display = 'block';
        document.getElementById('deleteNoteBtn').style.display = 'none';
        document.getElementById('uploadFileBtn').style.display = 'block'; // Show upload button for new notes
        this.hasUnsavedChanges = false;
        this.updateSaveButtonState();
        document.getElementById('noteTitle').focus();
        
        // Clear file attachments for new note
        this.fileAttachments = [];
        this.tempFileAttachments = [];
        this.renderFileAttachments();
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

        // Track save attempt
        this.trackUserAction('note_save_attempt', 'Notes', this.currentNoteId ? 'Update' : 'Create');

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
                // Show upload button now that we have a note ID
                document.getElementById('uploadFileBtn').style.display = 'block';
                
                // Associate temporary files with the newly saved note
                await this.associateTempFilesWithNote(savedNote.id);
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
            
            // Track successful save
            this.trackUserAction('note_save_success', 'Notes', this.currentNoteId ? 'Update' : 'Create');

        } catch (error) {
            console.error('Error saving note:', error);
            this.showDebugMessage(`❌ Debug: Save failed with error: ${error.message || JSON.stringify(error, null, 2)}`);
            this.showMessage(`Error saving note: ${error.message}`, 'error');
            
            // Track save error
            this.trackUserAction('note_save_error', 'Notes', this.currentNoteId ? 'Update' : 'Create');
        }
    }

    async deleteCurrentNote() {
        if (!this.currentNoteId) return;

        if (!confirm('Are you sure you want to delete this note?')) return;

        // Track delete attempt
        this.trackUserAction('note_delete_attempt', 'Notes', 'Delete');

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
            
            // Track successful delete
            this.trackUserAction('note_delete_success', 'Notes', 'Delete');

        } catch (error) {
            console.error('Error deleting note:', error);
            this.showMessage('Error deleting note', 'error');
            
            // Track delete error
            this.trackUserAction('note_delete_error', 'Notes', 'Delete');
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

    async handleUpgradeToPremium() {
        if (!this.currentUser) {
            this.showMessage('Please sign in to upgrade to premium', 'error');
            return;
        }

        try {
            this.showMessage('Creating checkout session...', 'info');
            console.log('Creating checkout for user:', this.currentUser.email);

            const response = await fetch('/api/checkout/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userEmail: this.currentUser.email,
                    userId: this.currentUser.uid
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Checkout creation error:', errorData);
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const checkoutData = await response.json();
            
            console.log('Checkout created successfully:', checkoutData);
            
            // Check if checkout_url exists in response
            if (!checkoutData.checkout_url) {
                console.error('No checkout_url in response:', checkoutData);
                throw new Error('Checkout URL not received from server');
            }
            
            // Open DodoPayments checkout in the same tab
            window.location.href = checkoutData.checkout_url;
            
            this.showMessage('Opening secure checkout page...', 'success');

        } catch (error) {
            console.error('Checkout creation error:', error);
            this.showMessage(`Checkout error: ${error.message}`, 'error');
        }
    }

    async checkUserSubscriptionStatus() {
        if (!this.currentUser) {
            return;
        }

        try {
            const response = await fetch(`/api/user/subscription-status?userId=${this.currentUser.uid}`);
            
            if (!response.ok) {
                console.error('Failed to fetch subscription status');
                return;
            }

            const subscriptionData = await response.json();
            console.log('User subscription status:', subscriptionData);
            
            // Update button based on subscription status
            this.updatePremiumButton(subscriptionData.is_premium);

        } catch (error) {
            console.error('Error checking subscription status:', error);
        }
    }

    updatePremiumButton(isPremium) {
        const premiumBtn = document.getElementById('buyPremiumBtn');
        const premiumText = premiumBtn.querySelector('.premium-text');
        
        if (isPremium) {
            premiumText.textContent = 'Premium';
            premiumBtn.title = 'You are a Premium user';
            premiumBtn.style.background = 'linear-gradient(135deg, #34c759 0%, #30a46c 100%)';
            premiumBtn.style.cursor = 'default';
            premiumBtn.onclick = null; // Remove click handler
        } else {
            premiumText.textContent = 'Upgrade To Premium';
            premiumBtn.title = 'Upgrade to Premium';
            premiumBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
            premiumBtn.style.cursor = 'pointer';
            premiumBtn.onclick = () => this.handleUpgradeToPremium();
        }
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

    // File Upload Methods
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        this.trackUserAction('file_upload_started', 'File Upload', `${files.length} files`);
        this.showDebugMessage(`🔍 Debug: Starting file upload for ${files.length} file(s)`);
        
        for (const file of files) {
            await this.uploadFile(file);
        }
        
        // Clear the file input
        document.getElementById('fileInput').value = '';
    }

    async uploadFile(file) {
        this.showDebugMessage(`🔍 Debug: Uploading file: ${file.name} (${this.formatFileSize(file.size)})`);
        
        try {
            // Validate file size (50MB limit)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                this.showMessage(`File ${file.name} is too large. Maximum size is 50MB.`, 'error');
                return;
            }

            // Generate unique file path
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${this.currentUser.uid}/${fileName}`;

            this.showDebugMessage(`🔍 Debug: Uploading to path: ${filePath}`);
            this.showDebugMessage(`🔍 Debug: Current note ID: ${this.currentNoteId}`);
            this.showDebugMessage(`🔍 Debug: Current user ID: ${this.currentUser.uid}`);

            // Use Supabase Storage API
            this.showDebugMessage(`🔍 Debug: Using Supabase Storage API`);
            
            const { data, error } = await this.supabaseStorage.storage
                .from('note-attachments')
                .upload(filePath, file);

            if (error) {
                this.showDebugMessage(`❌ Debug: Supabase Storage upload error: ${JSON.stringify(error, null, 2)}`);
                throw error;
            }

            this.showDebugMessage(`✅ Debug: File uploaded successfully: ${data.path}`);

            if (this.currentNoteId) {
                // Note is saved - save file metadata to database
                const attachmentData = {
                    note_id: this.currentNoteId,
                    user_id: this.currentUser.uid,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    storage_path: data.path,
                    storage_bucket: 'note-attachments'
                };

                const { data: attachment, error: dbError } = await this.supabase
                    .from('file_attachments')
                    .insert([attachmentData])
                    .select()
                    .single();

                if (dbError) {
                    this.showDebugMessage(`❌ Debug: Database error: ${JSON.stringify(dbError, null, 2)}`);
                    throw dbError;
                }

                this.showDebugMessage(`✅ Debug: File attachment saved to database`);

                // Add to local attachments array
                this.fileAttachments.push(attachment);
            } else {
                // Note is not saved yet - store temporarily
                const tempAttachment = {
                    id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                    note_id: null,
                    user_id: this.currentUser.uid,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    storage_path: data.path,
                    storage_bucket: 'note-attachments',
                    created_at: new Date().toISOString(),
                    is_temp: true
                };

                this.tempFileAttachments.push(tempAttachment);
                this.showDebugMessage(`✅ Debug: File stored temporarily for unsaved note`);
            }

            this.renderFileAttachments();
            this.showMessage(`File "${file.name}" uploaded successfully!`, 'success');
            
            // Load media preview immediately if it's an image or video
            if (this.isImageFile(file.name) || this.isVideoFile(file.name)) {
                const attachment = this.currentNoteId ? 
                    this.fileAttachments[this.fileAttachments.length - 1] : 
                    this.tempFileAttachments[this.tempFileAttachments.length - 1];
                
                if (attachment) {
                    await this.loadMediaPreview(attachment);
                }
            }

        } catch (error) {
            console.error('Error uploading file:', error);
            this.showDebugMessage(`❌ Debug: Upload failed: ${error.message}`);
            this.showMessage(`Error uploading file: ${error.message}`, 'error');
        }
    }

    async associateTempFilesWithNote(noteId) {
        if (this.tempFileAttachments.length === 0) {
            return;
        }

        this.showDebugMessage(`🔍 Debug: Associating ${this.tempFileAttachments.length} temporary files with note ${noteId}`);

        try {
            // Save temporary files to database
            const attachmentData = this.tempFileAttachments.map(tempFile => ({
                note_id: noteId,
                user_id: this.currentUser.uid,
                file_name: tempFile.file_name,
                file_size: tempFile.file_size,
                file_type: tempFile.file_type,
                storage_path: tempFile.storage_path,
                storage_bucket: tempFile.storage_bucket
            }));

            const { data: attachments, error } = await this.supabase
                .from('file_attachments')
                .insert(attachmentData)
                .select();

            if (error) {
                this.showDebugMessage(`❌ Debug: Error associating temp files: ${JSON.stringify(error, null, 2)}`);
                throw error;
            }

            // Move temporary files to regular attachments
            this.fileAttachments.push(...attachments);
            this.tempFileAttachments = [];
            
            this.showDebugMessage(`✅ Debug: Successfully associated ${attachments.length} files with note`);
            this.renderFileAttachments();

        } catch (error) {
            console.error('Error associating temporary files:', error);
            this.showDebugMessage(`❌ Debug: Failed to associate temp files: ${error.message}`);
        }
    }

    async loadFileAttachments() {
        // Clear all attachments first
        this.fileAttachments = [];
        this.tempFileAttachments = [];
        
        if (!this.currentNoteId) {
            this.renderFileAttachments();
            return;
        }

        try {
            this.showDebugMessage(`🔍 Debug: Loading file attachments for note: ${this.currentNoteId}`);

            const { data, error } = await this.supabase
                .from('file_attachments')
                .select('*')
                .eq('note_id', this.currentNoteId)
                .eq('user_id', this.currentUser.uid)
                .order('created_at', { ascending: false });

            if (error) {
                this.showDebugMessage(`❌ Debug: Error loading attachments: ${JSON.stringify(error, null, 2)}`);
                throw error;
            }

            this.fileAttachments = data || [];
            this.showDebugMessage(`✅ Debug: Loaded ${this.fileAttachments.length} file attachments for note ${this.currentNoteId}`);
            this.renderFileAttachments();

        } catch (error) {
            console.error('Error loading file attachments:', error);
            this.showDebugMessage(`❌ Debug: Failed to load attachments: ${error.message}`);
            this.fileAttachments = [];
            this.tempFileAttachments = [];
            this.renderFileAttachments();
        }
    }

    renderFileAttachments() {
        const attachmentsList = document.getElementById('attachmentsList');
        const fileAttachments = document.getElementById('fileAttachments');

        // Only show attachments for the current note
        const currentNoteAttachments = this.getCurrentNoteAttachments();

        if (currentNoteAttachments.length === 0) {
            fileAttachments.style.display = 'none';
            return;
        }

        fileAttachments.style.display = 'block';
        attachmentsList.innerHTML = currentNoteAttachments.map(attachment => 
            this.createAttachmentHTML(attachment)
        ).join('');

        // Add event listeners for attachment actions
        attachmentsList.querySelectorAll('.attachment-btn.download').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attachmentId = e.target.closest('.attachment-item').dataset.attachmentId;
                this.downloadAttachment(attachmentId);
            });
        });

        attachmentsList.querySelectorAll('.attachment-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attachmentId = e.target.closest('.attachment-item').dataset.attachmentId;
                this.deleteAttachment(attachmentId);
            });
        });

        // Load media previews for images and videos
        this.loadMediaPreviews();
    }

    getCurrentNoteAttachments() {
        // For saved notes, show saved attachments
        if (this.currentNoteId) {
            return this.fileAttachments.filter(attachment => attachment.note_id === this.currentNoteId);
        }
        
        // For new/unsaved notes, show temporary attachments
        return this.tempFileAttachments;
    }

    async loadMediaPreviews() {
        const currentNoteAttachments = this.getCurrentNoteAttachments();
        const mediaAttachments = currentNoteAttachments.filter(attachment => 
            this.isImageFile(attachment.file_name) || this.isVideoFile(attachment.file_name)
        );

        this.showDebugMessage(`🔍 Debug: Found ${mediaAttachments.length} media attachments to load`);
        
        for (const attachment of mediaAttachments) {
            this.showDebugMessage(`🔍 Debug: Loading preview for ${attachment.file_name} (ID: ${attachment.id})`);
            await this.loadMediaPreview(attachment);
        }
    }

    async loadMediaPreview(attachment) {
        const previewContainer = document.querySelector(`.media-preview[data-attachment-id="${attachment.id}"]`);
        if (!previewContainer) {
            this.showDebugMessage(`❌ Debug: Preview container not found for attachment ${attachment.id}`);
            return;
        }

        this.showDebugMessage(`🔍 Debug: Loading media preview for ${attachment.file_name}`);

        try {
            const previewUrl = await this.getFilePreviewUrl(attachment);
            if (!previewUrl) {
                this.showDebugMessage(`❌ Debug: No preview URL for ${attachment.file_name}`);
                previewContainer.innerHTML = '<div class="media-error">Failed to load preview</div>';
                return;
            }

            const isImage = this.isImageFile(attachment.file_name);
            const isVideo = this.isVideoFile(attachment.file_name);

            this.showDebugMessage(`🔍 Debug: Creating ${isImage ? 'image' : 'video'} preview for ${attachment.file_name}`);

            if (isImage) {
                previewContainer.innerHTML = `
                    <div class="image-preview">
                        <img src="${previewUrl}" alt="${attachment.file_name}" loading="lazy" />
                    </div>
                `;
                
                // Add error handler after creating the element
                const img = previewContainer.querySelector('img');
                img.onerror = () => {
                    previewContainer.innerHTML = '<div class="media-error">Failed to load image</div>';
                };
            } else if (isVideo) {
                previewContainer.innerHTML = `
                    <div class="video-preview">
                        <video controls preload="metadata" playsinline webkit-playsinline>
                            <source src="${previewUrl}" type="${attachment.file_type}">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
                
                // Add error handler and load event after creating the element
                const video = previewContainer.querySelector('video');
                video.onerror = () => {
                    this.showDebugMessage(`❌ Debug: Video failed to load: ${attachment.file_name}`);
                    previewContainer.innerHTML = '<div class="media-error">Failed to load video</div>';
                };
                
                video.onloadeddata = () => {
                    this.showDebugMessage(`✅ Debug: Video loaded successfully: ${attachment.file_name}`);
                };
                
                video.oncanplay = () => {
                    this.showDebugMessage(`✅ Debug: Video can play: ${attachment.file_name}`);
                };
            }

            this.showDebugMessage(`✅ Debug: Media preview created for ${attachment.file_name}`);

        } catch (error) {
            console.error('Error loading media preview:', error);
            this.showDebugMessage(`❌ Debug: Error loading media preview: ${error.message}`);
            previewContainer.innerHTML = '<div class="media-error">Failed to load preview</div>';
        }
    }

    createAttachmentHTML(attachment) {
        const fileIcon = this.getFileIcon(attachment.file_type);
        const fileSize = this.formatFileSize(attachment.file_size);
        const isImage = this.isImageFile(attachment.file_name);
        const isVideo = this.isVideoFile(attachment.file_name);
        
        let mediaPreview = '';
        if (isImage || isVideo) {
            mediaPreview = `
                <div class="media-preview" data-attachment-id="${attachment.id}">
                    <div class="media-loading">Loading preview...</div>
                </div>
            `;
        }

        return `
            <div class="attachment-item" data-attachment-id="${attachment.id}">
                <div class="attachment-icon">${fileIcon}</div>
                <div class="attachment-info">
                    <div class="attachment-name">${this.escapeHtml(attachment.file_name)}</div>
                    <div class="attachment-size">${fileSize}</div>
                </div>
                <div class="attachment-actions">
                    <button class="attachment-btn download" title="Download">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1V11M5.5 8.5L8 11L10.5 8.5M2 13H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="attachment-btn delete" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4H14M5.333 4V2.667C5.333 2.313 5.473 1.974 5.723 1.724C5.973 1.474 6.312 1.333 6.667 1.333H9.333C9.688 1.333 10.027 1.474 10.277 1.724C10.527 1.974 10.667 2.313 10.667 2.667V4M12.667 4V13.333C12.667 13.688 12.527 14.027 12.277 14.277C12.027 14.527 11.688 14.667 11.333 14.667H4.667C4.312 14.667 3.973 14.527 3.723 14.277C3.473 14.027 3.333 13.688 3.333 13.333V4H12.667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M6.667 7.333V11.333M9.333 7.333V11.333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                ${mediaPreview}
            </div>
        `;
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
            </svg>`;
        } else if (fileType.startsWith('video/')) {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <polygon points="5,3 19,12 5,21" stroke="currentColor" stroke-width="2"/>
            </svg>`;
        } else if (fileType === 'application/pdf') {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z" stroke="currentColor" stroke-width="2"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
                <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2"/>
            </svg>`;
        } else {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z" stroke="currentColor" stroke-width="2"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
            </svg>`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    isImageFile(fileName) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico'];
        const extension = fileName.split('.').pop().toLowerCase();
        return imageExtensions.includes(extension);
    }

    isVideoFile(fileName) {
        const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv'];
        const extension = fileName.split('.').pop().toLowerCase();
        return videoExtensions.includes(extension);
    }

    async getFilePreviewUrl(attachment) {
        try {
            this.showDebugMessage(`🔍 Debug: Creating signed URL for ${attachment.file_name}`);
            this.showDebugMessage(`🔍 Debug: Bucket: ${attachment.storage_bucket}, Path: ${attachment.storage_path}`);
            
            // Use signed URLs for all files to ensure access
            const { data, error } = await this.supabaseStorage.storage
                .from(attachment.storage_bucket)
                .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

            if (error) {
                this.showDebugMessage(`❌ Debug: Error creating signed URL: ${error.message}`);
                this.showDebugMessage(`❌ Debug: Error details: ${JSON.stringify(error, null, 2)}`);
                return null;
            }

            this.showDebugMessage(`✅ Debug: Created signed URL for ${attachment.file_name}`);
            this.showDebugMessage(`🔍 Debug: Signed URL: ${data.signedUrl.substring(0, 100)}...`);
            return data.signedUrl;
        } catch (error) {
            this.showDebugMessage(`❌ Debug: Error getting preview URL: ${error.message}`);
            return null;
        }
    }

    async downloadAttachment(attachmentId) {
        const currentNoteAttachments = this.getCurrentNoteAttachments();
        const attachment = currentNoteAttachments.find(a => a.id === attachmentId);
        if (!attachment) return;

        try {
            this.showDebugMessage(`🔍 Debug: Downloading file: ${attachment.file_name}`);

            // Use Supabase Storage API for download
            const { data, error } = await this.supabaseStorage.storage
                .from(attachment.storage_bucket)
                .download(attachment.storage_path);

            if (error) {
                this.showDebugMessage(`❌ Debug: Supabase Storage download error: ${JSON.stringify(error, null, 2)}`);
                throw error;
            }

            const blob = data;

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showDebugMessage(`✅ Debug: File downloaded successfully from Supabase Storage`);
            this.showMessage(`Downloaded "${attachment.file_name}"`, 'success');

        } catch (error) {
            console.error('Error downloading file:', error);
            this.showDebugMessage(`❌ Debug: Download failed: ${error.message}`);
            this.showMessage(`Error downloading file: ${error.message}`, 'error');
        }
    }

    async deleteAttachment(attachmentId) {
        const currentNoteAttachments = this.getCurrentNoteAttachments();
        const attachment = currentNoteAttachments.find(a => a.id === attachmentId);
        if (!attachment) return;

        if (!confirm(`Are you sure you want to delete "${attachment.file_name}"?`)) return;

        try {
            this.showDebugMessage(`🔍 Debug: Deleting attachment: ${attachment.file_name}`);

            // Delete from storage using Supabase Storage API
            const { error: storageError } = await this.supabaseStorage.storage
                .from(attachment.storage_bucket)
                .remove([attachment.storage_path]);

            if (storageError) {
                this.showDebugMessage(`❌ Debug: Supabase Storage delete error: ${JSON.stringify(storageError, null, 2)}`);
                // Continue with database deletion even if storage deletion fails
            } else {
                this.showDebugMessage(`✅ Debug: File deleted successfully from Supabase Storage`);
            }


            if (attachment.is_temp) {
                // Remove from temporary files
                this.tempFileAttachments = this.tempFileAttachments.filter(a => a.id !== attachmentId);
                this.showDebugMessage(`✅ Debug: Temporary file removed successfully`);
            } else {
                // Delete from database
                const { error: dbError } = await this.supabase
                    .from('file_attachments')
                    .delete()
                    .eq('id', attachmentId)
                    .eq('user_id', this.currentUser.uid);

                if (dbError) {
                    this.showDebugMessage(`❌ Debug: Database delete error: ${JSON.stringify(dbError, null, 2)}`);
                    throw dbError;
                }

                // Remove from local array
                this.fileAttachments = this.fileAttachments.filter(a => a.id !== attachmentId);
                this.showDebugMessage(`✅ Debug: File attachment deleted from database successfully`);
            }

            this.renderFileAttachments();
            this.showMessage(`Deleted "${attachment.file_name}"`, 'success');

        } catch (error) {
            console.error('Error deleting attachment:', error);
            this.showDebugMessage(`❌ Debug: Delete failed: ${error.message}`);
            this.showMessage(`Error deleting file: ${error.message}`, 'error');
        }
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