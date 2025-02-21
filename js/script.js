const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const compressionLevels = document.getElementById('compressionLevels');
const progressBar = document.getElementById('progressBar');
const targetSizeInput = document.getElementById('targetSize');
const applySizeBtn = document.getElementById('applySizeBtn');
const originalPreview = document.getElementById('originalPreview');
const compressedPreview = document.getElementById('compressedPreview');
const originalSize = document.getElementById('originalSize');
const compressedSize = document.getElementById('compressedSize');
const downloadBtn = document.getElementById('downloadBtn');

let originalFile, compressedBlob;
let currentQuality = 0.6; // Default to Medium

// Handle compression level selection
compressionLevels.addEventListener('click', (e) => {
    const button = e.target.closest('.btn');
    if (!button) return;

    // Update active state
    compressionLevels.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Set quality and update progress bar
    currentQuality = parseFloat(button.dataset.quality);
    updateProgressBar();

    // Recompress if an image is loaded
    if (originalFile) compressImage(originalFile);
});

// Handle custom size input
applySizeBtn.addEventListener('click', () => {
    const targetSizeKB = parseFloat(targetSizeInput.value);
    if (!targetSizeKB || targetSizeKB <= 0) {
        alert('Please enter a valid size in KB!');
        return;
    }
    if (!originalFile) {
        alert('Please upload an image first!');
        return;
    }

    // Deselect predefined levels
    compressionLevels.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));

    // Adjust quality to approximate target size
    adjustQualityForSize(originalFile, targetSizeKB * 1024); // Convert KB to bytes
});

// Update progress bar based on quality
function updateProgressBar() {
    const progress = ((1 - currentQuality) * 100); // Invert quality for progress
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
}

// Handle file input
imageInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Drag and drop functionality
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});

dropZone.addEventListener('click', () => imageInput.click());

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Please upload an image file!');
        return;
    }

    originalFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        originalPreview.src = e.target.result;
        originalSize.textContent = `Size: ${(file.size / 1024).toFixed(2)} KB`;
        compressImage(file); // Use current quality
    };
    reader.readAsDataURL(file);
}

function compressImage(file) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Compress image
        canvas.toBlob(
            (blob) => {
                compressedBlob = blob;
                compressedPreview.src = URL.createObjectURL(blob);
                compressedSize.textContent = `Size: ${(blob.size / 1024).toFixed(2)} KB`;
                downloadBtn.disabled = false;
            },
            'image/jpeg',
            currentQuality
        );
    };
    img.src = URL.createObjectURL(file);
}

// Adjust quality to match target size (binary search approximation)
function adjustQualityForSize(file, targetSize) {
    let minQuality = 0.1;
    let maxQuality = 1.0;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    function testQuality(quality) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
                (blob) => {
                    const sizeDiff = blob.size - targetSize;
                    attempts++;

                    if (Math.abs(sizeDiff) < 1024 || attempts >= maxAttempts) {
                        // Close enough or max attempts reached
                        currentQuality = quality;
                        updateProgressBar();
                        compressImage(file);
                        return;
                    }

                    if (sizeDiff > 0) {
                        // Size too large, reduce quality
                        maxQuality = quality;
                    } else {
                        // Size too small, increase quality
                        minQuality = quality;
                    }

                    const newQuality = (minQuality + maxQuality) / 2;
                    testQuality(newQuality);
                },
                'image/jpeg',
                quality
            );
        };
        img.src = URL.createObjectURL(file);
    }

    testQuality(0.5); // Start with middle quality
}

// Download compressed image
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(compressedBlob);
    link.download = 'compressed_image.jpg';
    link.click();
});

// Initialize progress bar
updateProgressBar();