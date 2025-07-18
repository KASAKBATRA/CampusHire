const AppState = {
    currentUser: null,
    students: [],
    companies: [],
    tnpOfficers: [],
    jobs: [],
    applications: [],
    currentPage: 'landing',
    
    // Initialize with sample data
    init() {
        this.loadFromStorage();
    },
    
    
    loadFromStorage() {
        const storedData = localStorage.getItem('campusHireData');
        if (storedData) {
            const data = JSON.parse(storedData);
            this.students = data.students || [];
            this.companies = data.companies || [];
            this.tnpOfficers = data.tnpOfficers || [];
            this.jobs = data.jobs || [];
            this.applications = data.applications || [];
        }
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
        }
    },
    
    saveToStorage() {
        const data = {
            students: this.students,
            companies: this.companies,
            tnpOfficers: this.tnpOfficers,
            jobs: this.jobs,
            applications: this.applications
        };
        localStorage.setItem('campusHireData', JSON.stringify(data));
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    },
    
    register(userData) {
        const users = {
            student: this.students,
            tnp: this.tnpOfficers,
            company: this.companies
        }[userData.role];
        
        if (users.some(user => user.email === userData.email)) {
            return { success: false, message: 'Email already exists.' };
        }
        if (userData.role === 'student' && users.some(user => user.rollNumber === userData.rollNumber)) {
            return { success: false, message: 'Roll number already exists.' };
        }
        if (userData.role === 'tnp' && users.some(user => user.employeeId === userData.employeeId)) {
            return { success: false, message: 'Employee ID already exists.' };
        }
        if (userData.role === 'company' && users.some(user => user.hrId === userData.hrId)) {
            return { success: false, message: 'HR ID already exists.' };
        }
        
        userData.id = Date.now().toString();
        if (userData.role === 'student') {
            userData.profileCompleted = false;
        }
        users.push(userData);
        this.saveToStorage();
        return { success: true, message: 'Registration successful! Please login.' };
    },
    
    login(email, password, role) {
        const users = {
            student: this.students,
            tnp: this.tnpOfficers,
            company: this.companies
        }[role];
        
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            this.currentUser = user;
            this.saveToStorage();
            return true;
        }
        return false;
    },
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.saveToStorage();
    },
    
    postJob(jobData) {
        jobData.id = Date.now().toString();
        jobData.postedDate = new Date().toISOString().split('T')[0];
        jobData.applicants = [];
        jobData.selected = [];
        this.jobs.push(jobData);
        this.companies.find(c => c.id === jobData.companyId).jobPostings.push(jobData.id);
        this.saveToStorage();
    },
    
    applyJob(studentId, jobId, coverLetter) {
        const application = {
            id: Date.now().toString(),
            studentId,
            jobId,
            status: 'pending',
            appliedDate: new Date().toISOString().split('T')[0],
            coverLetter
        };
        this.applications.push(application);
        this.jobs.find(j => j.id === jobId).applicants.push(studentId);
        this.students.find(s => s.id === studentId).applications.push(application.id);
        this.saveToStorage();
    },
    
    updateApplicationStatus(applicationId, status) {
        const application = this.applications.find(a => a.id === applicationId);
        if (application) {
            application.status = status;
            if (status === 'accepted') {
                const job = this.jobs.find(j => j.id === application.jobId);
                const student = this.students.find(s => s.id === application.studentId);
                job.selected.push(student.id);
                student.placement = {
                    company: job.companyName,
                    position: job.title,
                    package: job.package,
                    date: new Date().toISOString().split('T')[0]
                };
            }
            this.saveToStorage();
        }
    }
};

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    AppState.currentPage = pageId;
    
    if (pageId === 'student-dashboard') loadStudentDashboard();
    else if (pageId === 'tnp-dashboard') loadTnpDashboard();
    else if (pageId === 'company-dashboard') loadCompanyDashboard();
    else if (pageId === 'student-profile-edit-page') editStudentProfile();
}

// Modal management
function showModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'register-modal') {
        document.getElementById('register-form').reset();
        document.querySelectorAll('.role-fields').forEach(field => field.classList.remove('active'));
    }
}

// Role selection
function selectRole(role) {
    document.getElementById('register-role').value = role;
    showRoleFields();
    closeModal('role-modal');
    showModal('register-modal');
}

function showRoleFields() {
    const role = document.getElementById('register-role').value;
    document.querySelectorAll('.role-fields').forEach(field => field.classList.remove('active'));
    if (role) {
        document.getElementById(`${role}-fields`).classList.add('active');
    }
}

// Authentication
function showLogin() {
    showModal('login-modal');
}

function showRegister() {
    showModal('role-modal');
}

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const role = document.getElementById('login-role').value;
    
    if (!email || !password || !role) {
        showError('Please fill in all fields.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    if (AppState.login(email, password, role)) {
        closeModal('login-modal');
        if (role === 'student') {
            if (!AppState.currentUser.profileCompleted) {
                showPage('student-profile-edit-page');
            } else {
                showPage('student-dashboard');
            }
        } else if (role === 'tnp') {
            showPage('tnp-dashboard');
        } else if (role === 'company') {
            showPage('company-dashboard');
        }
        showSuccess('Login successful!');
    } else {
        showError('Invalid credentials or role.');
    }
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
});

document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    const userData = {
        name: document.getElementById('register-name').value.trim(),
        email: document.getElementById('register-email').value.trim(),
        phone: document.getElementById('register-phone').value.trim(),
        password: document.getElementById('register-password').value.trim(),
        role: document.getElementById('register-role').value
    };
    
    // Basic validation
    if (!userData.name || !userData.email || !userData.phone || !userData.password || !userData.role) {
        showError('Please fill in all required fields.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    // Phone number validation
    if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(userData.phone)) {
        showError('Phone number must include country code (e.g., +919876543210).');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/;
    if (!passwordRegex.test(userData.password)) {
        showError('Password must be at least 8 characters long, including a number and a special character.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    if (userData.role === 'student') {
        userData.course = document.getElementById('register-course').value;
        
        
        if (!userData.course === 0) {
            showError('Please fill in all student-specific fields.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
    } else if (userData.role === 'tnp') {
        userData.employeeId = document.getElementById('register-employee-id').value.trim();
        userData.position = document.getElementById('register-position').value;
        userData.department = document.getElementById('register-department-tnp').value;
        userData.phone = document.getElementById('register-phone-tnp').value.trim();
        
        if (!userData.employeeId || !userData.position || !userData.department || !userData.phone) {
            showError('Please fill in all T&P Panel-specific fields.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
        if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(userData.phone)) {
            showError('Phone number must include country code (e.g., +919876543210).');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
    } else if (userData.role === 'company') {
        userData.hrName = document.getElementById('register-hr-name').value.trim();
        userData.hrId = document.getElementById('register-hr-id').value.trim();
        userData.hrEmail = document.getElementById('register-hr-email').value.trim();
        userData.phone = document.getElementById('register-phone-company').value.trim();
        userData.companyName = document.getElementById('register-company-name').value.trim();
        userData.website = document.getElementById('register-website').value.trim();
        userData.jobPostings = [];
        
        if (!userData.hrName || !userData.hrId || !userData.hrEmail || !userData.phone || !userData.companyName || !userData.industry || !userData.website) {
            showError('Please fill in all company-specific fields.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
        if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(userData.phone)) {
            showError('Phone number must include country code (e.g., +919876543210).');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
    }
    
    const result = AppState.register(userData);
    if (result.success) {
        closeModal('register-modal');
        showSuccess(result.message);
        showLogin();
        document.getElementById('register-form').reset();
        document.querySelectorAll('.role-fields').forEach(field => field.classList.remove('active'));
    } else {
        showError(result.message);
    }
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
});

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.insertBefore(successDiv, document.body.firstChild);
    setTimeout(() => successDiv.remove(), 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
    setTimeout(() => errorDiv.remove(), 3000);
}

function logout() {
    AppState.logout();
    showPage('landing-page');
}

// Student dashboard
function loadStudentDashboard() {
    if (!AppState.currentUser || AppState.currentUser.role !== 'student') {
        showPage('landing-page');
        return;
    }
    
    if (!AppState.currentUser.profileCompleted) {
        showPage('student-profile-edit-page');
    } else {
        showStudentSection('profile');
    }
}

function showStudentSection(section) {
    document.querySelectorAll('#student-dashboard .dashboard-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#student-dashboard .nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`student-${section}`).classList.add('active');
    document.querySelector(`#student-dashboard .nav-btn[onclick*="showStudentSection('${section}')"]`).classList.add('active');
    
    if (section === 'profile') loadStudentProfile();
    else if (section === 'jobs') loadStudentJobs();
    else if (section === 'applications') loadStudentApplications();
}

function loadStudentProfile() {
    const student = AppState.currentUser;
    document.getElementById('student-name').textContent = student.name;
    document.getElementById('student-email').textContent = student.email;
    document.getElementById('student-course').textContent = `Course: ${student.course}`;
    document.getElementById('student-department').textContent = `Department: ${student.department}`;
    document.getElementById('student-year').textContent = `Year: ${student.year}`;
    document.getElementById('student-cgpa').textContent = `CGPA: ${student.cgpa}`;
    document.getElementById('student-phone').textContent = `Phone: ${student.phone || '-'}`;
    
    const skillsContainer = document.getElementById('student-skills');
    skillsContainer.innerHTML = student.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
    
    const applications = AppState.applications.filter(a => a.studentId === student.id);
    document.getElementById('applications-count').textContent = applications.length;
    document.getElementById('interviews-count').textContent = applications.filter(a => a.status === 'accepted').length;
    document.getElementById('offers-count').textContent = student.placement ? 1 : 0;
}

function editStudentProfile() {
    const student = AppState.currentUser;
    if (!student || student.role !== 'student') {
        showError('Error: No student logged in.');
        return;
    }
    
    document.getElementById('edit-student-name').value = student.name || '';
    document.getElementById('edit-student-phone').value = student.phone || '';
    document.getElementById('edit-student-github').value = student.github || '';
    document.getElementById('edit-student-linkedin').value = student.linkedIn || '';
    document.getElementById('edit-student-overall-cgpa').value = student.cgpa || '';
    document.getElementById('edit-student-10th').value = student.tenth || '';
    document.getElementById('edit-student-12th').value = student.twelfth || '';
    document.getElementById('edit-student-interest').value = student.interest || '';
    document.getElementById('edit-student-grad-year').value = student.gradYear || '';
    
    const skillsSelect = document.getElementById('edit-student-skills');
    Array.from(skillsSelect.options).forEach(option => {
        option.selected = student.skills.includes(option.value);
    });
    
    const semesterContainer = document.getElementById('semester-cgpa-container');
    semesterContainer.innerHTML = '';
    const semesters = student.cgpaSemesters || [];
    const maxSemesters = student.year * 2; // 2 semesters per year
    for (let i = 1; i <= maxSemesters; i++) {
        semesterContainer.innerHTML += `
            <div class="form-group">
                <label for="edit-semester-${i}">Semester ${i}</label>
                <input type="number" step="0.1" min="0" max="10" id="edit-semester-${i}" value="${semesters[i-1] || ''}" required>
            </div>
        `;
    }
    
    const resumeInput = document.getElementById('edit-student-resume');
    const resumePreview = document.getElementById('resume-preview');
    resumePreview.textContent = student.resume ? 'Current resume uploaded' : 'No resume uploaded';
    resumeInput.addEventListener('change', function() {
        resumePreview.textContent = this.files[0] ? `Selected: ${this.files[0].name}` : 'No file selected';
    });
    
    showPage('student-profile-edit-page');
}

document.getElementById('student-profile-edit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    if (!confirm('Are you sure you want to save these changes?')) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    const currentUser = AppState.currentUser;
    
    try {
        currentUser.name = document.getElementById('edit-student-name').value.trim();
        currentUser.phone = document.getElementById('edit-student-phone').value.trim();
        currentUser.github = document.getElementById('edit-student-github').value.trim();
        currentUser.linkedIn = document.getElementById('edit-student-linkedin').value.trim();
        currentUser.cgpa = parseFloat(document.getElementById('edit-student-overall-cgpa').value) || 0;
        currentUser.tenth = parseFloat(document.getElementById('edit-student-10th').value) || 0;
        currentUser.twelfth = parseFloat(document.getElementById('edit-student-12th').value) || 0;
        currentUser.interest = document.getElementById('edit-student-interest').value.trim();
        currentUser.gradYear = parseInt(document.getElementById('edit-student-grad-year').value) || 0;
        currentUser.skills = Array.from(document.getElementById('edit-student-skills').selectedOptions).map(opt => opt.value);
        
        if (!currentUser.name || !currentUser.phone || !currentUser.github || !currentUser.linkedIn || !currentUser.cgpa || !currentUser.tenth || !currentUser.twelfth || !currentUser.interest || !currentUser.gradYear || currentUser.skills.length === 0) {
            showError('Please fill in all required fields.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
        
        if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(currentUser.phone)) {
            showError('Phone number must include country code (e.g., +919876543210).');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
        
        currentUser.cgpaSemesters = [];
        const maxSemesters = currentUser.year * 2;
        for (let i = 1; i <= maxSemesters; i++) {
            const value = parseFloat(document.getElementById(`edit-semester-${i}`).value) || 0;
            if (value <= 0 || value > 10) {
                showError(`Invalid CGPA for Semester ${i}. Must be between 0 and 10.`);
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                return;
            }
            currentUser.cgpaSemesters.push(value);
        }
        
        const resumeInput = document.getElementById('edit-student-resume');
        const file = resumeInput.files[0];
        
        if (file) {
            if (file.type !== 'application/pdf') {
                showError('Please upload a valid PDF file for the resume.');
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                return;
            }
            const reader = new FileReader();
            reader.onload = function() {
                currentUser.resume = reader.result;
                finishUpdate();
            };
            reader.onerror = function() {
                showError('Error reading the resume file.');
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } else {
            finishUpdate();
        }
        
        function finishUpdate() {
            currentUser.profileCompleted = true;
            const index = AppState.students.findIndex(s => s.id === currentUser.id);
            if (index !== -1) {
                AppState.students[index] = currentUser;
            }
            AppState.saveToStorage();
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showPage('student-dashboard');
            loadStudentDashboard();
            showSuccess('Profile updated successfully!');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('An error occurred while updating the profile. Please try again.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

function toggleSemesterSection() {
    const section = document.getElementById('semester-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function loadStudentJobs() {
    const student = AppState.currentUser;
    const jobType = document.getElementById('job-filter').value;
    const department = document.getElementById('department-filter').value;
    
    const jobs = AppState.jobs.filter(job => {
        const isEligible = job.eligibleDepartments.includes(student.department) && student.cgpa >= job.minCgpa;
        const matchesType = !jobType || job.type === jobType;
        const matchesDept = !department || job.eligibleDepartments.includes(department);
        const isActive = new Date(job.deadline) >= new Date();
        return isEligible && matchesType && matchesDept && isActive;
    });
    
    const jobsGrid = document.getElementById('jobs-grid');
    jobsGrid.innerHTML = jobs.length > 0 ? jobs.map(job => `
        <div class="job-card">
            <div class="job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="job-company">${job.companyName}</p>
                </div>
                <span class="job-type ${job.type}">${job.type.charAt(0).toUpperCase() + job.type.slice(1)}</span>
            </div>
            <div class="job-details">
                <div class="job-detail"><strong>Package:</strong> <span>${job.package} LPA</span></div>
                <div class="job-detail"><strong>Location:</strong> <span>${job.location}</span></div>
                <div class="job-detail"><strong>Deadline:</strong> <span>${job.deadline}</span></div>
                <div class="job-detail"><strong>Min CGPA:</strong> <span>${job.minCgpa}</span></div>
            </div>
            <div class="job-skills">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div>
            <div class="job-actions">
                <button class="btn btn-primary" onclick="applyJob('${job.id}')">Apply Now</button>
            </div>
        </div>
    `).join('') : '<div class="empty-state"><h4>No Jobs Available</h4><p>Check back later for new opportunities.</p></div>';
}

function filterJobs() {
    loadStudentJobs();
}

function applyJob(jobId) {
    const student = AppState.currentUser;
    const job = AppState.jobs.find(j => j.id === jobId);
    
    if (AppState.applications.some(a => a.studentId === student.id && a.jobId === jobId)) {
        showError('You have already applied for this job.');
        return;
    }
    
    const coverLetter = prompt('Enter a brief cover letter:');
    if (coverLetter) {
        AppState.applyJob(student.id, jobId, coverLetter);
        showSuccess('Application submitted successfully!');
        loadStudentJobs();
        loadStudentApplications();
    }
}

function loadStudentApplications() {
    const student = AppState.currentUser;
    const applications = AppState.applications.filter(a => a.studentId === student.id);
    
    const applicationsList = document.getElementById('applications-list');
    applicationsList.innerHTML = applications.length > 0 ? applications.map(app => {
        const job = AppState.jobs.find(j => j.id === app.jobId);
        return `
            <div class="application-card">
                <div class="application-header">
                    <div class="application-info">
                        <h4>${job.title}</h4>
                        <p>${job.companyName}</p>
                    </div>
                    <span class="application-status status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                </div>
                <div class="application-details">
                    <div class="application-detail">
                        <strong>Applied On:</strong>
                        <span>${app.appliedDate}</span>
                    </div>
                    <div class="application-detail">
                        <strong>Cover Letter:</strong>
                        <span>${app.coverLetter.substring(0, 100)}...</span>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<div class="empty-state"><h4>No Applications</h4><p>You haven\'t applied to any jobs yet.</p></div>';
}

// T&P Panel dashboard
function loadTnpDashboard() {
    if (!AppState.currentUser || AppState.currentUser.role !== 'tnp') {
        showPage('landing-page');
        return;
    }
    
    showTnpSection('profile');
}

function showTnpSection(section) {
    document.querySelectorAll('#tnp-dashboard .dashboard-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#tnp-dashboard .nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tnp-${section}`).classList.add('active');
    document.querySelector(`#tnp-dashboard .nav-btn[onclick*="showTnpSection('${section}')"]`).classList.add('active');
    
    if (section === 'profile') loadTnpProfile();
    else if (section === 'overview') loadTnpOverview();
    else if (section === 'students') loadTnpStudents();
    else if (section === 'companies') loadTnpCompanies();
    else if (section === 'jobs') loadTnpJobs();
    else if (section === 'placements') loadTnpPlacements();
}

function loadTnpProfile() {
    const tnp = AppState.currentUser;
    document.getElementById('tnp-name').textContent = tnp.name;
    document.getElementById('tnp-email').textContent = tnp.email;
    document.getElementById('tnp-position').textContent = `Position: ${tnp.position}`;
    document.getElementById('tnp-department').textContent = `Department: ${tnp.department}`;
    document.getElementById('tnp-employee-id').textContent = `Employee ID: ${tnp.employeeId}`;
    document.getElementById('tnp-phone').textContent = `Phone: ${tnp.phone || '-'}`;
    
    document.getElementById('managed-students').textContent = AppState.students.length;
    document.getElementById('managed-companies').textContent = AppState.companies.length;
    document.getElementById('managed-placements').textContent = AppState.students.filter(s => s.placement).length;
}

function editTnpProfile() {
    const tnp = AppState.currentUser;
    document.getElementById('edit-tnp-name').value = tnp.name;
    document.getElementById('edit-tnp-employee-id').value = tnp.employeeId;
    document.getElementById('edit-tnp-position').value = tnp.position;
    document.getElementById('edit-tnp-department').value = tnp.department;
    document.getElementById('edit-tnp-phone').value = tnp.phone || '';
    showModal('tnp-profile-edit-modal');
}

document.getElementById('tnp-profile-edit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    if (!confirm('Are you sure you want to save these changes?')) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    const tnp = AppState.currentUser;
    const newEmployeeId = document.getElementById('edit-tnp-employee-id').value.trim();
    
    if (newEmployeeId !== tnp.employeeId && AppState.tnpOfficers.some(t => t.employeeId === newEmployeeId)) {
        showError('Employee ID already exists.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    tnp.name = document.getElementById('edit-tnp-name').value.trim();
    tnp.employeeId = newEmployeeId;
    tnp.position = document.getElementById('edit-tnp-position').value;
    tnp.department = document.getElementById('edit-tnp-department').value;
    tnp.phone = document.getElementById('edit-tnp-phone').value.trim();
    
    if (!tnp.name || !tnp.employeeId || !tnp.position || !tnp.department || !tnp.phone) {
        showError('Please fill in all required fields.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(tnp.phone)) {
        showError('Phone number must include country code (e.g., +919876543210).');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    const index = AppState.tnpOfficers.findIndex(t => t.id === tnp.id);
    if (index !== -1) {
        AppState.tnpOfficers[index] = tnp;
    }
    AppState.saveToStorage();
    localStorage.setItem('currentUser', JSON.stringify(tnp));
    closeModal('tnp-profile-edit-modal');
    loadTnpProfile();
    showSuccess('Profile updated successfully!');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
});

function loadTnpOverview() {
    document.getElementById('total-students').textContent = AppState.students.length;
    document.getElementById('total-companies').textContent = AppState.companies.length;
    document.getElementById('total-jobs').textContent = AppState.jobs.length;
    document.getElementById('total-placements').textContent = AppState.students.filter(s => s.placement).length;
    
    const departments = ['CSE', 'ECE', 'ME', 'EE', 'IT'];
    const deptDistribution = document.getElementById('department-distribution');
    deptDistribution.innerHTML = departments.map(dept => {
        const count = AppState.students.filter(s => s.department === dept).length;
        const percentage = AppState.students.length ? (count / AppState.students.length * 100).toFixed(1) : 0;
        return `
            <div class="chart-bar">
                <span class="chart-label">${dept}</span>
                <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                <span class="chart-value">${count}</span>
            </div>
        `;
    }).join('');
    
    const placementStats = document.getElementById('placement-stats');
    placementStats.innerHTML = departments.map(dept => {
        const placed = AppState.students.filter(s => s.department === dept && s.placement).length;
        const total = AppState.students.filter(s => s.department === dept).length;
        const percentage = total ? (placed / total * 100).toFixed(1) : 0;
        return `
            <div class="chart-bar">
                <span class="chart-label">${dept}</span>
                <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                <span class="chart-value">${placed}/${total}</span>
            </div>
        `;
    }).join('');
    
    const recentActivities = document.getElementById('recent-activities-list');
    const activities = AppState.applications.slice(-5).reverse().map(app => {
        const student = AppState.students.find(s => s.id === app.studentId);
        const job = AppState.jobs.find(j => j.id === app.jobId);
        return `
            <div class="activity-item">
                <div class="activity-icon">📝</div>
                <div class="activity-content">
                    <p>${student.name} applied for ${job.title} at ${job.companyName}</p>
                    <span class="activity-time">${app.appliedDate}</span>
                </div>
            </div>
        `;
    });
    recentActivities.innerHTML = activities.length > 0 ? activities.join('') : '<div class="empty-state"><h4>No Recent Activities</h4></div>';
}

function loadTnpStudents() {
    const deptFilter = document.getElementById('student-dept-filter').value;
    const statusFilter = document.getElementById('student-status-filter').value;
    const minCgpa = parseFloat(document.getElementById('min-cgpa-filter').value) || 0;
    
    const students = AppState.students.filter(student => {
        const matchesDept = !deptFilter || student.department === deptFilter;
        const matchesStatus = !statusFilter || (statusFilter === 'placed' && student.placement) || (statusFilter === 'unplaced' && !student.placement);
        const matchesCgpa = student.cgpa >= minCgpa;
        return matchesDept && matchesStatus && matchesCgpa;
    });
    
    const table = document.getElementById('students-table');
    table.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Roll Number</th>
                    <th>Course</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>CGPA</th>
                    <th>Placement</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${students.map(student => `
                    <tr>
                        <td>${student.name}</td>
                        <td>${student.rollNumber}</td>
                        <td>${student.course}</td>
                        <td>${student.department}</td>
                        <td>${student.year}</td>
                        <td>${student.cgpa}</td>
                        <td><span class="placement-status ${student.placement ? 'placed' : 'unplaced'}">${student.placement ? 'Placed' : 'Unplaced'}</span></td>
                        <td class="table-actions">
                            <button class="btn btn-primary btn-small" onclick="viewStudentDetails('${student.id}')">View</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterStudents() {
    loadTnpStudents();
}

function viewStudentDetails(studentId) {
    const student = AppState.students.find(s => s.id === studentId);
    alert(`
        Name: ${student.name}
        Email: ${student.email}
        Roll Number: ${student.rollNumber}
        Course: ${student.course}
        Department: ${student.department}
        Year: ${student.year}
        CGPA: ${student.cgpa}
        Skills: ${student.skills.join(', ')}
        Phone: ${student.phone || '-'}
        Placement: ${student.placement ? `${student.placement.position} at ${student.placement.company}` : 'Not placed'}
    `);
}

function loadTnpCompanies() {
    const table = document.getElementById('companies-table');
    table.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Company Name</th>
                    <th>HR Name</th>
                    <th>HR ID</th>
                    <th>HR Email</th>
                    <th>Industry</th>
                    <th>Phone</th>
                    <th>Jobs Posted</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${AppState.companies.map(company => `
                    <tr>
                        <td>${company.companyName}</td>
                        <td>${company.hrName}</td>
                        <td>${company.hrId}</td>
                        <td>${company.hrEmail}</td>
                        <td>${company.industry}</td>
                        <td>${company.phone || '-'}</td>
                        <td>${company.jobPostings.length}</td>
                        <td class="table-actions">
                            <button class="btn btn-primary btn-small" onclick="viewCompanyDetails('${company.id}')">View</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function viewCompanyDetails(companyId) {
    const company = AppState.companies.find(c => c.id === companyId);
    alert(`
        Company Name: ${company.companyName}
        HR Name: ${company.hrName}
        HR ID: ${company.hrId}
        HR Email: ${company.hrEmail}
        Industry: ${company.industry}
        Website: ${company.website || '-'}
        Phone: ${company.phone || '-'}
        Jobs Posted: ${company.jobPostings.length}
    `);
}

function loadTnpJobs() {
    const jobType = document.getElementById('job-type-filter').value;
    const statusFilter = document.getElementById('job-status-filter').value;
    
    const jobs = AppState.jobs.filter(job => {
        const matchesType = !jobType || job.type === jobType;
        const isActive = new Date(job.deadline) >= new Date();
        const matchesStatus = !statusFilter || (statusFilter === 'active' && isActive) || (statusFilter === 'expired' && !isActive);
        return matchesType && matchesStatus;
    });
    
    const jobsList = document.getElementById('tnp-jobs-list');
    jobsList.innerHTML = jobs.length > 0 ? jobs.map(job => `
        <div class="company-job-card">
            <div class="company-job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="job-company">${job.companyName}</p>
                </div>
                <span class="job-type ${new Date(job.deadline) >= new Date() ? 'active' : 'expired'}">${new Date(job.deadline) >= new Date() ? 'Active' : 'Expired'}</span>
            </div>
            <div class="job-stats">
                <div class="job-stat">
                    <span class="job-stat-number">${job.applicants.length}</span>
                    <span class="job-stat-label">Applicants</span>
                </div>
                <div class="job-stat">
                    <span class="job-stat-number">${job.selected.length}</span>
                    <span class="job-stat-label">Selected</span>
                </div>
            </div>
            <div class="job-details">
                <div class="job-detail"><strong>Package:</strong> <span>${job.package} LPA</span></div>
                <div class="job-detail"><strong>Location:</strong> <span>${job.location}</span></div>
                <div class="job-detail"><strong>Deadline:</strong> <span>${job.deadline}</span></div>
                <div class="job-detail"><strong>Min CGPA:</strong> <span>${job.minCgpa}</span></div>
            </div>
        </div>
    `).join('') : '<div class="empty-state"><h4>No Jobs</h4><p>No jobs match the selected filters.</p></div>';
}

function filterTnpJobs() {
    loadTnpJobs();
}

function loadTnpPlacements() {
    const placements = AppState.students.filter(s => s.placement);
    const table = document.getElementById('placements-table');
    table.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Course</th>
                    <th>Department</th>
                    <th>Company</th>
                    <th>Position</th>
                    <th>Package</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${placements.map(student => `
                    <tr>
                        <td>${student.name}</td>
                        <td>${student.rollNumber}</td>
                        <td>${student.course}</td>
                        <td>${student.department}</td>
                        <td>${student.placement.company}</td>
                        <td>${student.placement.position}</td>
                        <td>${student.placement.package} LPA</td>
                        <td>${student.placement.date}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Company dashboard
function loadCompanyDashboard() {
    if (!AppState.currentUser || AppState.currentUser.role !== 'company') {
        showPage('landing-page');
        return;
    }
    
    showCompanySection('profile');
}

function showCompanySection(section) {
    document.querySelectorAll('#company-dashboard .dashboard-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#company-dashboard .nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`company-${section}`).classList.add('active');
    document.querySelector(`#company-dashboard .nav-btn[onclick*="showCompanySection('${section}')"]`).classList.add('active');
    
    if (section === 'profile') loadCompanyProfile();
    else if (section === 'jobs') loadCompanyJobs();
    else if (section === 'students') loadCompanyStudents();
    else if (section === 'applications') loadCompanyApplications();
}

function loadCompanyProfile() {
    const company = AppState.currentUser;
    document.getElementById('company-name').textContent = company.companyName;
    document.getElementById('company-hr-name').textContent = `HR Name: ${company.hrName}`;
    document.getElementById('company-hr-id').textContent = `HR ID: ${company.hrId}`;
    document.getElementById('company-hr-email').textContent = `HR Email: ${company.hrEmail}`;
    document.getElementById('company-industry').textContent = `Industry: ${company.industry}`;
    document.getElementById('company-website').textContent = `Website: ${company.website || '-'}`;
    document.getElementById('company-phone').textContent = `Phone: ${company.phone || '-'}`;
    
    document.getElementById('company-jobs-count').textContent = company.jobPostings.length;
    document.getElementById('company-applications-count').textContent = AppState.applications.filter(a => company.jobPostings.includes(a.jobId)).length;
    document.getElementById('company-hires-count').textContent = AppState.applications.filter(a => company.jobPostings.includes(a.jobId) && a.status === 'accepted').length;
}

function editCompanyProfile() {
    const company = AppState.currentUser;
    document.getElementById('edit-company-hr-name').value = company.hrName;
    document.getElementById('edit-company-hr-id').value = company.hrId;
    document.getElementById('edit-company-hr-email').value = company.hrEmail;
    document.getElementById('edit-company-phone').value = company.phone || '';
    document.getElementById('edit-company-name').value = company.companyName;
    document.getElementById('edit-company-industry').value = company.industry;
    document.getElementById('edit-company-website').value = company.website || '';
    showModal('company-profile-edit-modal');
}

document.getElementById('company-profile-edit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    if (!confirm('Are you sure you want to save these changes?')) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    const company = AppState.currentUser;
    const newHrId = document.getElementById('edit-company-hr-id').value.trim();
    
    if (newHrId !== company.hrId && AppState.companies.some(c => c.hrId === newHrId)) {
        showError('HR ID already exists.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    company.hrName = document.getElementById('edit-company-hr-name').value.trim();
    company.hrId = newHrId;
    company.hrEmail = document.getElementById('edit-company-hr-email').value.trim();
    company.phone = document.getElementById('edit-company-phone').value.trim();
    company.companyName = document.getElementById('edit-company-name').value.trim();
    company.industry = document.getElementById('edit-company-industry').value.trim();
    company.website = document.getElementById('edit-company-website').value.trim();
    
    if (!company.hrName || !company.hrId || !company.hrEmail || !company.phone || !company.companyName || !company.industry || !company.website) {
        showError('Please fill in all required fields.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(company.phone)) {
        showError('Phone number must include country code (e.g., +919876543210).');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    const index = AppState.companies.findIndex(c => c.id === company.id);
    if (index !== -1) {
        AppState.companies[index] = company;
    }
    AppState.saveToStorage();
    localStorage.setItem('currentUser', JSON.stringify(company));
    closeModal('company-profile-edit-modal');
    loadCompanyProfile();
    showSuccess('Profile updated successfully!');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
});

function showJobForm() {
    document.getElementById('job-form').reset();
    showModal('job-form-modal');
}

document.getElementById('job-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    const jobData = {
        companyId: AppState.currentUser.id,
        companyName: AppState.currentUser.companyName,
        title: document.getElementById('job-title').value.trim(),
        type: document.getElementById('job-type').value,
        description: document.getElementById('job-description').value.trim(),
        requirements: document.getElementById('job-requirements').value.trim().split('\n').filter(r => r.trim()),
        skills: document.getElementById('job-skills').value.split(',').map(s => s.trim()).filter(s => s),
        eligibleDepartments: Array.from(document.getElementById('job-eligible-departments').selectedOptions).map(opt => opt.value),
        minCgpa: parseFloat(document.getElementById('job-min-cgpa').value) || 0,
        package: parseFloat(document.getElementById('job-package').value) || 0,
        location: document.getElementById('job-location').value.trim(),
        deadline: document.getElementById('job-deadline').value
    };
    
    if (!jobData.title || !jobData.type || !jobData.description || !jobData.requirements.length || !jobData.skills.length || !jobData.eligibleDepartments.length || !jobData.minCgpa || !jobData.package || !jobData.location || !jobData.deadline) {
        showError('Please fill in all required fields.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    AppState.postJob(jobData);
    closeModal('job-form-modal');
    loadCompanyJobs();
    showSuccess('Job posted successfully!');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
});

function loadCompanyJobs() {
    const company = AppState.currentUser;
    const jobs = AppState.jobs.filter(j => j.companyId === company.id);
    
    const jobsList = document.getElementById('company-jobs-list');
    jobsList.innerHTML = jobs.length > 0 ? jobs.map(job => `
        <div class="company-job-card">
            <div class="company-job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="job-company">${job.companyName}</p>
                </div>
                <span class="job-type ${new Date(job.deadline) >= new Date() ? 'active' : 'expired'}">${new Date(job.deadline) >= new Date() ? 'Active' : 'Expired'}</span>
            </div>
            <div class="job-stats">
                <div class="job-stat">
                    <span class="job-stat-number">${job.applicants.length}</span>
                    <span class="job-stat-label">Applicants</span>
                </div>
                <div class="job-stat">
                    <span class="job-stat-number">${job.selected.length}</span>
                    <span class="job-stat-label">Selected</span>
                </div>
            </div>
            <div class="job-details">
                <div class="job-detail"><strong>Package:</strong> <span>${job.package} LPA</span></div>
                <div class="job-detail"><strong>Location:</strong> <span>${job.location}</span></div>
                <div class="job-detail"><strong>Deadline:</strong> <span>${job.deadline}</span></div>
                <div class="job-detail"><strong>Min CGPA:</strong> <span>${job.minCgpa}</span></div>
            </div>
            <div class="company-job-actions">
                <button class="btn btn-primary btn-small" onclick="viewJobApplications('${job.id}')">View Applications</button>
            </div>
        </div>
    `).join('') : '<div class="empty-state"><h4>No Jobs Posted</h4><p>Post a new job to start receiving applications.</p></div>';
}

function loadCompanyStudents() {
    const deptFilter = document.getElementById('student-dept-filter-company').value;
    const minCgpa = parseFloat(document.getElementById('min-cgpa-company').value) || 0;
    const yearFilter = document.getElementById('year-filter-company').value;
    
    const students = AppState.students.filter(student => {
        const matchesDept = !deptFilter || student.department === deptFilter;
        const matchesCgpa = student.cgpa >= minCgpa;
        const matchesYear = !yearFilter || student.year.toString() === yearFilter;
        return matchesDept && matchesCgpa && matchesYear;
    });
    
    const studentsGrid = document.getElementById('students-grid');
    studentsGrid.innerHTML = students.length > 0 ? students.map(student => `
        <div class="student-card">
            <div class="student-header">
                <div class="student-avatar">👤</div>
                <div class="student-info">
                    <h4>${student.name}</h4>
                    <p>${student.course} - ${student.department} - Year ${student.year}</p>
                </div>
            </div>
            <div class="student-details">
                <div class="student-detail"><strong>CGPA:</strong> <span>${student.cgpa}</span></div>
                <div class="student-detail"><strong>Skills:</strong> <span>${student.skills.join(', ')}</span></div>
                <div class="student-detail"><strong>Placement:</strong> <span>${student.placement ? 'Placed' : 'Unplaced'}</span></div>
            </div>
            <div class="job-actions">
                <button class="btn btn-primary btn-small" onclick="viewStudentDetails('${student.id}')">View Profile</button>
            </div>
        </div>
    `).join('') : '<div class="empty-state"><h4>No Students Found</h4><p>Adjust filters to find students.</p></div>';
}

function filterCompanyStudents() {
    loadCompanyStudents();
}

function loadCompanyApplications() {
    const company = AppState.currentUser;
    const statusFilter = document.getElementById('application-status-filter').value;
    
    const applications = AppState.applications.filter(a => company.jobPostings.includes(a.jobId) && (!statusFilter || a.status === statusFilter));
    
    const applicationsList = document.getElementById('job-applications-list');
    applicationsList.innerHTML = applications.length > 0 ? applications.map(app => {
        const student = AppState.students.find(s => s.id === app.studentId);
        const job = AppState.jobs.find(j => j.id === app.jobId);
        return `
            <div class="application-card">
                <div class="application-header">
                    <div class="application-info">
                        <h4>${student.name} - ${job.title}</h4>
                        <p>${student.course} - ${student.department} | CGPA: ${student.cgpa}</p>
                    </div>
                    <span class="application-status status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                </div>
                <div class="application-details">
                    <div class="application-detail">
                        <strong>Applied On:</strong>
                        <span>${app.appliedDate}</span>
                    </div>
                    <div class="application-detail">
                        <strong>Cover Letter:</strong>
                        <span>${app.coverLetter.substring(0, 100)}...</span>
                    </div>
                    <div class="application-detail">
                        <strong>Skills:</strong>
                        <span>${student.skills.join(', ')}</span>
                    </div>
                </div>
                <div class="job-actions">
                    <button class="btn btn-primary btn-small" onclick="viewStudentDetails('${student.id}')">View Profile</button>
                    ${app.status === 'pending' ? `
                        <button class="btn btn-secondary btn-small" onclick="updateApplicationStatus('${app.id}', 'accepted')">Accept</button>
                        <button class="btn btn-danger btn-small" onclick="updateApplicationStatus('${app.id}', 'rejected')">Reject</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('') : '<div class="empty-state"><h4>No Applications</h4><p>No applications match the selected filters.</p></div>';
}

function filterApplications() {
    loadCompanyApplications();
}

function viewJobApplications(jobId) {
    document.getElementById('application-status-filter').value = '';
    loadCompanyApplications();
    showCompanySection('applications');
}

function updateApplicationStatus(applicationId, status) {
    AppState.updateApplicationStatus(applicationId, status);
    loadCompanyApplications();
    showSuccess(`Application ${status}!`);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    AppState.init();
    showPage('landing-page');
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => selectRole(btn.dataset.role));
    });
});