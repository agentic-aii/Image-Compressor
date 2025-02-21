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

    compressionLevels.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    currentQuality = parseFloat(button.dataset.quality);
    updateProgressBar();

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

    compressionLevels.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
    adjustQualityForSize(originalFile, targetSizeKB * 1024); // Convert KB to bytes
});

// Update progress bar
function updateProgressBar() {
    const progress = ((1 - currentQuality) * 100);
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
}

// Handle file input
imageInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

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
        compressImage(file);
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

// Improved adjustQualityForSize to ensure size is at or below target
function adjustQualityForSize(file, targetSize) {
    let quality = 0.5; // Start with mid-point
    const step = 0.05; // Smaller steps for precision
    let attempts = 0;
    const maxAttempts = 20;

    function testCompression(testQuality) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
                (blob) => {
                    const currentSize = blob.size;
                    attempts++;

                    if (currentSize <= targetSize || testQuality <= 0.1 || attempts >= maxAttempts) {
                        // Stop if size is at or below target, quality is minimum, or max attempts reached
                        currentQuality = testQuality;
                        updateProgressBar();
                        compressImage(file);
                        if (currentSize > targetSize) {
                            alert('Could not compress below target size. Using lowest quality.');
                        }
                        return;
                    }

                    // If size is still too large, reduce quality
                    quality -= step;
                    testCompression(quality);
                },
                'image/jpeg',
                testQuality
            );
        };
        img.src = URL.createObjectURL(file);
    }

    testCompression(quality);
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