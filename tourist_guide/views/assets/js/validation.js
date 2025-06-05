                    document.addEventListener('DOMContentLoaded', function () {
                        const form = document.getElementById('membershipForm');
                        const submitBtn = form.querySelector('button[type="submit"]');
                        const originalBtnText = submitBtn.textContent;

                        // Initialize iziToast
                        iziToast.settings({
                            timeout: 5000,
                            position: 'topRight',
                            transitionIn: 'fadeInDown',
                            transitionOut: 'fadeOutUp'
                        });

                        form.addEventListener('submit', async function (e) {
                            e.preventDefault();

                            // Client-side validation
                            let isValid = true;
                            const requiredFields = form.querySelectorAll('[required]');

                            requiredFields.forEach(field => {
                                if (!field.value) {
                                    isValid = false;
                                    field.classList.add('is-invalid');
                                }
                            });

                            // Validate checkbox
                            if (!document.getElementById('loginRemember').checked) {
                                isValid = false;
                                iziToast.error({
                                    title: 'Error',
                                    message: 'Please accept the declaration'
                                });
                                return;
                            }

                            if (!isValid) {
                                iziToast.error({
                                    title: 'Error',
                                    message: 'Please fill all required fields'
                                });
                                return;
                            }

                            // Prepare form data
                            const formData = new FormData(form);

                            // Show loading state
                            submitBtn.disabled = true;
                            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                            try {
                                const response = await axios.post(form.action, formData, {
                                    headers: {
                                        'Content-Type': 'multipart/form-data'
                                    }
                                });

                                // Handle your existing API response format
                                if (response.data && response.data.success) {
                                    iziToast.success({
                                        title: 'Success',
                                        message: response.data.message || 'Form submitted successfully',
                                        onClosed: function () {
                                            // Optional: Redirect after success
                                            window.location.href = '/membership';
                                        }
                                    });
                                    form.reset();
                                } else {
                                    // Handle case where API doesn't return success flag
                                    iziToast.error({
                                        title: 'Error',
                                        message: response.data.message || 'Submission failed'
                                    });
                                }
                            } catch (error) {
                                let errorMessage = 'An error occurred';

                                // Handle your existing API error format
                                if (error.response) {
                                    if (error.response.data && error.response.data.message) {
                                        errorMessage = error.response.data.message;
                                    } else {
                                        errorMessage = `Server error (${error.response.status})`;
                                    }
                                } else if (error.request) {
                                    errorMessage = 'No response from server';
                                } else {
                                    errorMessage = error.message;
                                }

                                iziToast.error({
                                    title: 'Error',
                                    message: errorMessage
                                });
                            } finally {
                                // Reset button state
                                submitBtn.disabled = false;
                                submitBtn.textContent = originalBtnText;
                            }
                        });

                        // Remove invalid class when user starts typing
                        document.querySelectorAll('input, select, textarea').forEach(el => {
                            el.addEventListener('input', function () {
                                this.classList.remove('is-invalid');
                            });
                        });

                        // Test if iziToast is working
                        setTimeout(() => {
                            iziToast.info({
                                title: 'System',
                                message: 'Form ready for submission'
                            });
                        }, 1000);
                    });
                