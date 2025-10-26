// Node.js script to create favicon files
// Run with: node create-favicon.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to create a favicon with the letter T
function createFavicon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#1e3a8a');
    
    // Draw background circle
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw letter T
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', size/2, size/2);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`public/${filename}`, buffer);
    console.log(`Created ${filename} (${size}x${size})`);
}

// Create different sizes
try {
    createFavicon(16, 'favicon-16x16.png');
    createFavicon(32, 'favicon-32x32.png');
    createFavicon(48, 'favicon-48x48.png');
    createFavicon(180, 'apple-touch-icon.png');
    
    // Copy 32x32 as main favicon.ico (browsers will handle it)
    fs.copyFileSync('public/favicon-32x32.png', 'public/favicon.ico');
    console.log('Created favicon.ico');
    
    console.log('\n✅ All favicon files created successfully!');
    console.log('Files created in public/ folder:');
    console.log('- favicon.ico');
    console.log('- favicon-16x16.png');
    console.log('- favicon-32x32.png');
    console.log('- favicon-48x48.png');
    console.log('- apple-touch-icon.png');
    
} catch (error) {
    console.error('Error creating favicons:', error.message);
    console.log('\nTo install canvas dependency, run:');
    console.log('npm install canvas');
    console.log('\nAlternatively, use the favicon-generator.html file in your browser.');
}
