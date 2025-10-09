// Note App JavaScript
class NoteApp {
    constructor() {
        this.notes = this.loadNotes();
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderNotes();
    }

    bindEvents() {
        const form = document.getElementById('noteForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        
        if (!title || !content) {
            alert('Please fill in both title and content fields.');
            return;
        }

        this.createNote(title, content);
        this.clearForm();
    }

    createNote(title, content) {
        const note = {
            id: Date.now().toString(),
            title: title,
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.notes.unshift(note); // Add to beginning of array
        this.saveNotes();
        this.renderNotes();
        
        // Show success message
        this.showMessage('Note created successfully!', 'success');
    }

    renderNotes() {
        const notesList = document.getElementById('notesList');
        
        if (this.notes.length === 0) {
            notesList.innerHTML = `
                <div class="no-notes">
                    <p>No notes yet. Create your first note above!</p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = this.notes.map(note => this.createNoteHTML(note)).join('');
    }

    createNoteHTML(note) {
        const date = new Date(note.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="note-card" data-id="${note.id}">
                <div class="note-title">${this.escapeHtml(note.title)}</div>
                <div class="note-content">${this.escapeHtml(note.content)}</div>
                <div class="note-meta">
                    <span class="note-date">Created: ${formattedDate}</span>
                    <span class="note-id">ID: ${note.id}</span>
                </div>
            </div>
        `;
    }

    clearForm() {
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
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
            background: ${type === 'success' ? '#48bb78' : '#4299e1'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Local Storage methods
    saveNotes() {
        try {
            localStorage.setItem('simple-notes', JSON.stringify(this.notes));
        } catch (error) {
            console.error('Error saving notes:', error);
            this.showMessage('Error saving notes to local storage', 'error');
        }
    }

    loadNotes() {
        try {
            const saved = localStorage.getItem('simple-notes');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showMessage('Error loading notes from local storage', 'error');
            return [];
        }
    }

    // Public methods for future features
    getNotes() {
        return this.notes;
    }

    getNoteById(id) {
        return this.notes.find(note => note.id === id);
    }

    getNotesCount() {
        return this.notes.length;
    }
}

// Add CSS for message animations
const style = document.createElement('style');
style.textContent = `
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
    window.noteApp = new NoteApp();
    
    // Add some helpful console messages
    console.log('📝 Simple Note App initialized!');
    console.log('Notes loaded:', window.noteApp.getNotesCount());
    
    // Add keyboard shortcut for creating notes (Ctrl/Cmd + Enter)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const form = document.getElementById('noteForm');
            const title = document.getElementById('noteTitle').value.trim();
            const content = document.getElementById('noteContent').value.trim();
            
            if (title && content) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });
});
