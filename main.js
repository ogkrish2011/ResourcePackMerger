// Minecraft Resource Pack Merger - Main JavaScript
class ResourcePackMerger {
    constructor() {
        this.uploadedFiles = [];
        this.mergedPack = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // File input and browse button
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');
        const uploadZone = document.getElementById('uploadZone');

        browseBtn.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Warning modal buttons
        document.getElementById('continueBtn').addEventListener('click', () => {
            document.getElementById('sizeWarning').style.display = 'none';
            this.processPendingFile();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            document.getElementById('sizeWarning').style.display = 'none';
            this.pendingFile = null;
        });

        // Pack customization
        document.getElementById('packIcon').parentElement.addEventListener('click', () => {
            document.getElementById('iconInput').click();
        });

        document.getElementById('iconInput').addEventListener('change', (e) => {
            this.handleIconChange(e.target.files[0]);
        });

        // Merge button
        document.getElementById('mergeBtn').addEventListener('click', () => {
            this.mergePacks();
        });
    }

    setupDragAndDrop() {
        const uploadZone = document.getElementById('uploadZone');

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.name.toLowerCase().endsWith('.zip')) {
                this.showNotification('Only .zip files are supported!', 'error');
                return;
            }

            // Check file size (75MB = 75 * 1024 * 1024 bytes)
            const maxSize = 75 * 1024 * 1024;
            if (file.size > maxSize) {
                this.pendingFile = file;
                document.getElementById('sizeWarning').style.display = 'flex';
            } else {
                this.addFile(file);
            }
        });
    }

    processPendingFile() {
        if (this.pendingFile) {
            this.addFile(this.pendingFile);
            this.pendingFile = null;
        }
    }

    addFile(file) {
        // Check if file already exists
        if (this.uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
            this.showNotification('File already added!', 'warning');
            return;
        }

        this.uploadedFiles.push(file);
        this.updateFilesList();
        this.updateSections();
        this.showNotification(`Added: ${file.name}`, 'success');
    }

    updateFilesList() {
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info-content">
                    <i class="fas fa-archive file-icon"></i>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${this.formatFileSize(file.size)} • Added ${new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
                <button class="remove-btn" onclick="merger.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            filesList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateFilesList();
        this.updateSections();
        this.showNotification('File removed', 'info');
    }

    updateSections() {
        const filesSection = document.getElementById('filesSection');
        const editorSection = document.getElementById('editorSection');
        const mergeSection = document.getElementById('mergeSection');

        if (this.uploadedFiles.length > 0) {
            filesSection.style.display = 'block';
            editorSection.style.display = 'block';
            mergeSection.style.display = 'block';
        } else {
            filesSection.style.display = 'none';
            editorSection.style.display = 'none';
            mergeSection.style.display = 'none';
        }
    }

    handleIconChange(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('packIcon').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    async mergePacks() {
        if (this.uploadedFiles.length === 0) {
            this.showNotification('Please add at least one resource pack!', 'error');
            return;
        }

        // Show progress
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('mergeBtn').disabled = true;

        try {
            await this.performMerge();
        } catch (error) {
            console.error('Merge failed:', error);
            this.showNotification('Merge failed. Please try again.', 'error');
        } finally {
            document.getElementById('progressSection').style.display = 'none';
            document.getElementById('mergeBtn').disabled = false;
        }
    }

    async performMerge() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        // Create new ZIP for merged pack
        const mergedZip = new JSZip();
        const packName = document.getElementById('packName').value || 'Merged Resource Pack';
        const packDescription = document.getElementById('packDescription').value || 'A combination of multiple resource packs merged together';

        // Step 1: Load all ZIP files
        progressText.textContent = 'Loading resource packs...';
        progressFill.style.width = '10%';

        const zipFiles = [];
        for (let i = 0; i < this.uploadedFiles.length; i++) {
            const file = this.uploadedFiles[i];
            const zip = new JSZip();
            const arrayBuffer = await this.fileToArrayBuffer(file);
            const loadedZip = await zip.loadAsync(arrayBuffer);
            zipFiles.push(loadedZip);
            
            progressFill.style.width = `${10 + (i + 1) * 30 / this.uploadedFiles.length}%`;
        }

        // Step 2: Create pack.mcmeta
        progressText.textContent = 'Creating pack metadata...';
        progressFill.style.width = '45%';

        const packMeta = {
            pack: {
                pack_format: 15, // Latest format for Minecraft 1.20+
                description: packDescription
            }
        };
        mergedZip.file('pack.mcmeta', JSON.stringify(packMeta, null, 2));

        // Step 3: Add custom icon if provided
        progressText.textContent = 'Adding pack icon...';
        progressFill.style.width = '50%';

        const iconElement = document.getElementById('packIcon');
        if (iconElement.src && !iconElement.src.includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')) {
            const iconBlob = await this.dataURItoBlob(iconElement.src);
            mergedZip.file('pack.png', iconBlob);
        }

        // Step 4: Merge all files from resource packs
        progressText.textContent = 'Merging resource pack files...';
        const allFiles = new Map(); // Path -> File content mapping

        for (let i = 0; i < zipFiles.length; i++) {
            const zip = zipFiles[i];
            
            await Promise.all(Object.keys(zip.files).map(async (filePath) => {
                const zipEntry = zip.files[filePath];
                
                if (!zipEntry.dir && filePath !== 'pack.mcmeta' && filePath !== 'pack.png') {
                    try {
                        const content = await zipEntry.async('arraybuffer');
                        
                        // Handle conflicts by prioritizing later packs (last one wins)
                        allFiles.set(filePath, content);
                    } catch (error) {
                        console.warn(`Failed to read file ${filePath}:`, error);
                    }
                }
            }));

            progressFill.style.width = `${50 + (i + 1) * 35 / zipFiles.length}%`;
        }

        // Step 5: Add merged files to ZIP
        progressText.textContent = 'Building final resource pack...';
        progressFill.style.width = '85%';

        let fileCount = 0;
        const totalFiles = allFiles.size;

        for (const [filePath, content] of allFiles) {
            mergedZip.file(filePath, content);
            fileCount++;
            
            if (fileCount % 50 === 0) { // Update progress every 50 files
                progressFill.style.width = `${85 + (fileCount / totalFiles) * 10}%`;
                await this.sleep(1); // Small delay to allow UI updates
            }
        }

        // Step 6: Generate and download
        progressText.textContent = 'Generating download...';
        progressFill.style.width = '95%';

        const blob = await mergedZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });

        progressFill.style.width = '100%';
        progressText.textContent = 'Complete! Downloading...';

        // Auto-download
        this.downloadBlob(blob, `${packName.replace(/[^a-zA-Z0-9]/g, '_')}.zip`);
        
        await this.sleep(1000);
        this.showNotification('Resource pack merged and downloaded successfully!', 'success');
    }

    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    dataURItoBlob(dataURI) {
        return fetch(dataURI).then(res => res.blob());
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 350px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        // Set background color based on type
        const colors = {
            success: '#55FF55',
            error: '#FF5555',
            warning: '#FFAA00',
            info: '#5555FF'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the merger when page loads
let merger;
document.addEventListener('DOMContentLoaded', () => {
    merger = new ResourcePackMerger();
});

// Add some fun easter eggs
document.addEventListener('keydown', (e) => {
    // Konami code: Up, Up, Down, Down, Left, Right, Left, Right, B, A
    const konamiCode = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'KeyB', 'KeyA'
    ];
    
    if (!window.konamiProgress) window.konamiProgress = 0;
    
    if (e.code === konamiCode[window.konamiProgress]) {
        window.konamiProgress++;
        if (window.konamiProgress === konamiCode.length) {
            // Easter egg activated!
            document.body.style.filter = 'hue-rotate(180deg)';
            merger.showNotification('🎉 Konami Code Activated! Colors inverted!', 'success');
            window.konamiProgress = 0;
            setTimeout(() => {
                document.body.style.filter = '';
            }, 5000);
        }
    } else {
        window.konamiProgress = 0;
    }
});