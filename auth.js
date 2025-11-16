document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();

    const authForm = document.getElementById('auth-form');
    if (!authForm) return; // Don't run on other pages

    const errorMessageDiv = document.getElementById('error-message');
    const toggleLink = document.getElementById('toggle-link');
    let isRegisterMode = false;

    // Check if a user is already logged in and redirect
    auth.onAuthStateChanged(user => {
        if (user) window.location.href = 'invoice.html';
    });
    /**
     * Displays an error message in the error message div.
     * @param {string} message The message to display.
     * @param {boolean} isError Whether the message is an error (for styling).
     */
    const showMessage = (message, isError = true) => {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
        errorMessageDiv.style.color = isError ? '#721c24' : '#155724';
        errorMessageDiv.style.borderColor = isError ? '#f5c6cb' : '#c3e6cb';
        errorMessageDiv.style.display = 'block';
    };

    /**
     * Hides the error message div.
     */
    const hideMessage = () => {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    };

    const setAuthMode = (register) => {
        isRegisterMode = register;
        hideMessage();
        document.getElementById('confirm-password-group').style.display = register ? 'block' : 'none';
        document.getElementById('auth-title').textContent = register ? 'Create an Account' : 'Login to Your Account';
        document.getElementById('auth-subtitle').textContent = register ? 'Get started with your free account.' : 'Enter your credentials to access your invoices.';
        document.getElementById('auth-button').querySelector('span').textContent = register ? 'Register' : 'Login';
        document.getElementById('toggle-text').textContent = register ? 'Already have an account? ' : "Don't have an account? ";
        toggleLink.textContent = register ? 'Log in' : 'Sign up';
        lucide.createIcons();
    };

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode(!isRegisterMode);
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideMessage();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (isRegisterMode) {
            // --- Handle Registration ---
            const confirmPassword = document.getElementById('confirm-password').value;
            if (password !== confirmPassword) {
                showMessage('Passwords do not match.');
                return;
            }
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Registration successful:', userCredential.user);
                    showMessage('Registration successful! Please log in.', false);
                    setAuthMode(false); // Switch to login mode
                })
                .catch((error) => {
                    showMessage(error.message);
                });
        } else {
            // --- Handle Login ---
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Login successful:', userCredential.user);
                    window.location.href = 'invoice.html';
                })
                .catch((error) => {
                    showMessage(error.message);
                });
        }
    });
});