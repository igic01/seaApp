// Log when page is ready
console.log('UI loaded successfully!');

// Test backend connection
document.getElementById('testBtn').addEventListener('click', async () => {
    try {
        // Call Python backend function
        const response = await pywebview.api.test_function();

        // Display result
        const resultDiv = document.getElementById('result');
        resultDiv.textContent = response;
        resultDiv.classList.add('show');
    } catch (error) {
        console.error('Error calling backend:', error);
        const resultDiv = document.getElementById('result');
        resultDiv.textContent = 'Error connecting to backend';
        resultDiv.classList.add('show');
    }
});

