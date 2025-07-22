// script.js
const AppState = {
    currentUser: null,
    students: [],
    companies: [],
    tnpOfficers: [],
    jobs: [],
    applications: [],

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
            return { success: true };
        }
        const allUsers = [...this.students, ...this.tnpOfficers, ...this.companies];
        if (allUsers.some(u => u.email === email)) {
            return { success: false, message: 'Invalid password.' };
        }
        return { success: false, message: 'User not found. Please register first.' };
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
        const company = this.companies.find(c => c.id === jobData.companyId);
        if (company) {
            if (!company.jobPostings) {
                company.jobPostings = [];
            }
            company.jobPostings.push(jobData.id);
        }
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
        const job = this.jobs.find(j => j.id === jobId);
        if (job) {
            if (!job.applicants) {
                job.applicants = [];
            }
            job.applicants.push(studentId);
        }
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            if (!student.applications) {
                student.applications = [];
            }
            student.applications.push(application.id);
        }
        this.saveToStorage();
    },

    updateApplicationStatus(applicationId, status) {
        const application = this.applications.find(a => a.id === applicationId);
        if (application) {
            application.status = status;
            if (status === 'accepted') {
                const job = this.jobs.find(j => j.id === application.jobId);
                const student = this.students.find(s => s.id === application.studentId);
                if (job && student) {
                    if (!job.selected) {
                        job.selected = [];
                    }
                    job.selected.push(student.id);
                    student.placement = {
                        company: job.companyName,
                        position: job.title || job.position,
                        package: job.salary ? job.salary.totalCtc : job.stipend,
                        date: new Date().toISOString().split('T')[0]
                    };
                }
            }
            this.saveToStorage();
        }
    }
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    AppState.currentPage = pageId;

    if (pageId === 'student-dashboard') loadStudentDashboard();
    else if (pageId === 'tnp-dashboard') loadTnpDashboard();
    else if (pageId === 'company-dashboard') loadCompanyDashboard();
    else if (pageId === 'student-profile-edit-page') editStudentProfile();
}

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
    if (modalId === 'login-modal') {
        document.getElementById('login-form').reset();
        document.getElementById('login-message').innerHTML = '';
    }
}

function selectRole(role) {
    document.getElementById('register-role').value = role;
    showRoleFields();
    closeModal('role-modal');
    showModal('register-modal');
}

function selectLoginRole(role) {
    document.getElementById('login-role').value = role;
    closeModal('login-role-modal');
    showModal('login-modal');
}

function showRoleFields() {
    const role = document.getElementById('register-role').value;
    document.querySelectorAll('.role-fields').forEach(field => {
        field.classList.remove('active');
        field.querySelectorAll('input, select').forEach(el => el.disabled = true);
    });
    if (role) {
        const activeFields = document.getElementById(`${role}-fields`);
        activeFields.classList.add('active');
        activeFields.querySelectorAll('input, select').forEach(el => el.disabled = false);
    }
}

function showLogin() {
    showModal('login-role-modal');
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
        showError('Please fill in all fields.', 'login-message');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }

    const loginResult = AppState.login(email, password, role);
    if (loginResult.success) {
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
        showSuccess('Login successful!', 'login-message');
    } else {
        showError(loginResult.message, 'login-message');
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

    if (!userData.name || !userData.email || !userData.phone || !userData.password || !userData.role) {
        showError('Please fill in all required fields.', 'register-message');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }

    if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(userData.phone)) {
        showError('Phone number must include country code (e.g., +919876543210).', 'register-message');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }

    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/;
    if (!passwordRegex.test(userData.password)) {
        showError('Password must be at least 8 characters long, including a number and a special character.', 'register-message');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }

    if (userData.role === 'student') {
        userData.course = document.getElementById('register-course').value;
        if (!userData.course) {
            showError('Please fill in all student-specific fields.', 'register-message');
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
            showError('Please fill in all T&P Panel-specific fields.', 'register-message');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
        if (!/^\+[0-9]{1,3}[0-9]{10}$/.test(userData.phone)) {
            showError('Phone number must include country code (e.g., +919876543210).', 'register-message');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
    } else if (userData.role === 'company') {
        userData.hrId = document.getElementById('register-hr-id').value.trim();
        userData.companyName = document.getElementById('register-company-name').value.trim();
        userData.industry = document.getElementById('register-industry').value.trim();
        userData.website = document.getElementById('register-website').value.trim();
        userData.jobPostings = [];

        if (!userData.hrId || !userData.companyName || !userData.industry || !userData.website) {
            showError('Please fill in all company-specific fields.', 'register-message');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
    }

    const result = AppState.register(userData);
    if (result.success) {
        showSuccess(result.message, 'register-message');
        closeModal('register-modal');
        showLogin();
        document.getElementById('register-form').reset();
        document.querySelectorAll('.role-fields').forEach(field => field.classList.remove('active'));
    } else {
        showError(result.message, 'register-message');
    }
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
});

function showSuccess(message, targetId = 'register-message') {
    const msgDiv = document.getElementById(targetId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="success-message">${message}</div>`;
        setTimeout(() => { msgDiv.innerHTML = ''; }, 3000);
    } else {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.body.insertBefore(successDiv, document.body.firstChild);
        setTimeout(() => successDiv.remove(), 3000);
    }
}

function showError(message, targetId = 'register-message') {
    const msgDiv = document.getElementById(targetId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="error-message">${message}</div>`;
        setTimeout(() => { msgDiv.innerHTML = ''; }, 3000);
    } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.insertBefore(errorDiv, document.body.firstChild);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

function logout() {
    AppState.logout();
    showPage('landing-page');
}

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
    document.getElementById('student-course').textContent = `Course: ${student.course || 'N/A'}`;
    document.getElementById('student-department').textContent = `Department: ${student.department || 'N/A'}`;
    document.getElementById('student-year').textContent = `Year: ${student.year || 'N/A'}`;
    document.getElementById('student-cgpa').textContent = `CGPA: ${student.cgpa || 'N/A'}`;
    document.getElementById('student-phone').textContent = `Phone: ${student.phone || '-'}`;

    const skillsDropdown = document.getElementById('student-skills-dropdown');
    if (skillsDropdown && student.skills) {
        Array.from(skillsDropdown.options).forEach(option => {
            option.selected = student.skills.includes(option.value);
        });
    }

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
    const selectedSkillsDisplay = document.getElementById('selected-skills-display');
    selectedSkillsDisplay.innerHTML = '';

    Array.from(skillsSelect.options).forEach(option => {
        option.selected = false;
    });

    if (student.skills && student.skills.length > 0) {
        student.skills.forEach(skill => {
            const option = Array.from(skillsSelect.options).find(opt => opt.value === skill);
            if (option) {
                option.selected = true;
            }
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.textContent = skill;
            selectedSkillsDisplay.appendChild(skillTag);
        });
    }

    const addCustomSkillBtn = document.getElementById('add-custom-skill-btn');
    const customSkillInput = document.getElementById('edit-student-custom-skill');

    const newAddCustomSkillBtnHandler = () => {
        const customSkill = customSkillInput.value.trim();
        if (customSkill && !student.skills.includes(customSkill)) {
            student.skills.push(customSkill);
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.textContent = customSkill;
            selectedSkillsDisplay.appendChild(skillTag);
            customSkillInput.value = '';
        } else if (student.skills.includes(customSkill)) {
            showError('Skill already added.');
        }
    };
    addCustomSkillBtn.removeEventListener('click', addCustomSkillBtn._handler);
    addCustomSkillBtn.addEventListener('click', newAddCustomSkillBtnHandler);
    addCustomSkillBtn._handler = newAddCustomSkillBtnHandler;

    const semesterContainer = document.getElementById('semester-cgpa-container');
    semesterContainer.innerHTML = '';
    const semesters = student.cgpaSemesters || [];
    const maxSemesters = (student.year || 1) * 2;
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
    const newResumeInputHandler = function() {
        resumePreview.textContent = this.files[0] ? `Selected: ${this.files[0].name}` : 'No file selected';
    };
    resumeInput.removeEventListener('change', resumeInput._handler);
    resumeInput.addEventListener('change', newResumeInputHandler);
    resumeInput._handler = newResumeInputHandler;
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

        const selectedDropdownSkills = Array.from(document.getElementById('edit-student-skills').selectedOptions).map(opt => opt.value);
        const currentCustomSkills = Array.from(document.getElementById('selected-skills-display').children)
                                    .map(tag => tag.textContent.replace(' ×', '').trim());
        currentUser.skills = [...new Set([...selectedDropdownSkills, ...currentCustomSkills])];

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
        const maxSemesters = (currentUser.year || 1) * 2;
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
        const isEligible = (job.eligibility && job.eligibility.preferredCourses && job.eligibility.preferredCourses.includes(student.course)) &&
                           (job.eligibility && student.cgpa >= job.eligibility.minCgpa);
        const matchesType = !jobType || job.type === jobType;
        const matchesDept = !department || (job.eligibility && job.eligibility.preferredCourses && job.eligibility.preferredCourses.includes(department));
        const isActive = job.deadline ? new Date(job.deadline) >= new Date() : true;

        return isEligible && matchesType && matchesDept && isActive;
    });

    const jobsGrid = document.getElementById('jobs-grid');
    jobsGrid.innerHTML = jobs.length > 0 ? jobs.map(job => {
        const displayTitle = job.type === 'job' ? job.title : job.position;
        const displayPackage = job.type === 'job' ? `${job.salary.totalCtc} LPA` : `${job.stipend} /month`;
        const displayLocation = job.type === 'job' ? job.locations.join(', ') : 'N/A';
        const displayMinCgpa = job.eligibility ? job.eligibility.minCgpa : 'N/A';
        const displaySkills = job.skills ? job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('') : '';
        const displayDeadline = job.deadline || 'N/A';

        return `
            <div class="job-card">
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${displayTitle}</h3>
                        <p class="job-company">${job.companyName}</p>
                    </div>
                    <span class="job-type ${job.type}">${job.type.charAt(0).toUpperCase() + job.type.slice(1)}</span>
                </div>
                <div class="job-details">
                    <div class="job-detail"><strong>${job.type === 'job' ? 'Package' : 'Stipend'}:</strong> <span>${displayPackage}</span></div>
                    <div class="job-detail"><strong>Location:</strong> <span>${displayLocation}</span></div>
                    <div class="job-detail"><strong>Deadline:</strong> <span>${displayDeadline}</span></div>
                    <div class="job-detail"><strong>Min CGPA:</strong> <span>${displayMinCgpa}</span></div>
                </div>
                <div class="job-skills">${displaySkills}</div>
                <div class="job-actions">
                    <button class="btn btn-primary" onclick="applyJob('${job.id}')">Apply Now</button>
                </div>
            </div>
        `;
    }).join('') : '<div class="empty-state"><h4>No Jobs Available</h4><p>Check back later for new opportunities.</p></div>';
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
        if (!job) return '';

        const displayTitle = job.type === 'job' ? job.title : job.position;
        const displayCompany = job.companyName;

        return `
            <div class="application-card">
                <div class="application-header">
                    <div class="application-info">
                        <h4>${displayTitle}</h4>
                        <p>${displayCompany}</p>
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
        if (!student || !job) return '';

        const displayJobTitle = job.type === 'job' ? job.title : job.position;

        return `
            <div class="activity-item">
                <div class="activity-icon">📝</div>
                <div class="activity-content">
                    <p>${student.name} applied for ${displayJobTitle} at ${job.companyName}</p>
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
                        <td>${student.rollNumber || 'N/A'}</td>
                        <td>${student.course || 'N/A'}</td>
                        <td>${student.department || 'N/A'}</td>
                        <td>${student.year || 'N/A'}</td>
                        <td>${student.cgpa || 'N/A'}</td>
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
    if (!student) {
        alert('Student not found.');
        return;
    }
    alert(`
        Name: ${student.name || 'N/A'}
        Email: ${student.email || 'N/A'}
        Roll Number: ${student.rollNumber || 'N/A'}
        Course: ${student.course || 'N/A'}
        Department: ${student.department || 'N/A'}
        Year: ${student.year || 'N/A'}
        CGPA: ${student.cgpa || 'N/A'}
        Skills: ${student.skills ? student.skills.join(', ') : 'N/A'}
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
                        <td>${company.companyName || 'N/A'}</td>
                        <td>${company.hrName || 'N/A'}</td>
                        <td>${company.hrId || 'N/A'}</td>
                        <td>${company.hrEmail || 'N/A'}</td>
                        <td>${company.industry || 'N/A'}</td>
                        <td>${company.phone || '-'}</td>
                        <td>${company.jobPostings ? company.jobPostings.length : 0}</td>
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
    if (!company) {
        alert('Company not found.');
        return;
    }
    alert(`
        Company Name: ${company.companyName || 'N/A'}
        HR Name: ${company.hrName || 'N/A'}
        HR ID: ${company.hrId || 'N/A'}
        HR Email: ${company.hrEmail || 'N/A'}
        Industry: ${company.industry || 'N/A'}
        Website: ${company.website || '-'}
        Phone: ${company.phone || '-'}
        Jobs Posted: ${company.jobPostings ? company.jobPostings.length : 0}
    `);
}

function loadTnpJobs() {
    const jobType = document.getElementById('job-type-filter').value;
    const statusFilter = document.getElementById('job-status-filter').value;

    const jobs = AppState.jobs.filter(job => {
        const matchesType = !jobType || job.type === jobType;
        const isActive = job.deadline ? new Date(job.deadline) >= new Date() : true;
        const matchesStatus = !statusFilter || (statusFilter === 'active' && isActive) || (statusFilter === 'expired' && !isActive);
        return matchesType && matchesStatus;
    });

    const jobsList = document.getElementById('tnp-jobs-list');
    jobsList.innerHTML = jobs.length > 0 ? jobs.map(job => {
        const displayTitle = job.type === 'job' ? job.title : job.position;
        const displayPackage = job.type === 'job' ? `${job.salary ? job.salary.totalCtc : 'N/A'} LPA` : `${job.stipend || 'N/A'} /month`;
        const displayLocation = job.type === 'job' ? (job.locations ? job.locations.join(', ') : 'N/A') : 'N/A';
        const displayMinCgpa = job.eligibility ? job.eligibility.minCgpa : 'N/A';
        const displayDeadline = job.deadline || 'N/A';

        return `
            <div class="company-job-card">
                <div class="company-job-header">
                    <div>
                        <h3 class="job-title">${displayTitle}</h3>
                        <p class="job-company">${job.companyName}</p>
                    </div>
                    <span class="job-type ${new Date(job.deadline || '9999-12-31') >= new Date() ? 'active' : 'expired'}">${new Date(job.deadline || '9999-12-31') >= new Date() ? 'Active' : 'Expired'}</span>
                </div>
                <div class="job-stats">
                    <div class="job-stat">
                        <span class="job-stat-number">${job.applicants ? job.applicants.length : 0}</span>
                        <span class="job-stat-label">Applicants</span>
                    </div>
                    <div class="job-stat">
                        <span class="job-stat-number">${job.selected ? job.selected.length : 0}</span>
                        <span class="job-stat-label">Selected</span>
                    </div>
                </div>
                <div class="job-details">
                    <div class="job-detail"><strong>${job.type === 'job' ? 'Package' : 'Stipend'}:</strong> <span>${displayPackage}</span></div>
                    <div class="job-detail"><strong>Location:</strong> <span>${displayLocation}</span></div>
                    <div class="job-detail"><strong>Deadline:</strong> <span>${displayDeadline}</span></div>
                    <div class="job-detail"><strong>Min CGPA:</strong> <span>${displayMinCgpa}</span></div>
                </div>
            </div>
        `;
    }).join('') : '<div class="empty-state"><h4>No Jobs</h4><p>No jobs match the selected filters.</p></div>';
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
                        <td>${student.name || 'N/A'}</td>
                        <td>${student.rollNumber || 'N/A'}</td>
                        <td>${student.course || 'N/A'}</td>
                        <td>${student.department || 'N/A'}</td>
                        <td>${student.placement.company || 'N/A'}</td>
                        <td>${student.placement.position || 'N/A'}</td>
                        <td>${student.placement.package || 'N/A'} LPA</td>
                        <td>${student.placement.date || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

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
    document.getElementById('company-hr-name').textContent = `HR Name: ${company.hrName || 'N/A'}`;
    document.getElementById('company-hr-id').textContent = `HR ID: ${company.hrId || 'N/A'}`;
    document.getElementById('company-hr-email').textContent = `HR Email: ${company.hrEmail || 'N/A'}`;
    document.getElementById('company-industry').textContent = `Industry: ${company.industry || 'N/A'}`;
    document.getElementById('company-website').textContent = `Website: ${company.website || '-'}`;
    document.getElementById('company-phone').textContent = `Phone: ${company.phone || '-'}`;

    document.getElementById('company-jobs-count').textContent = company.jobPostings ? company.jobPostings.length : 0;
    const companyJobIds = company.jobPostings || [];
    document.getElementById('company-applications-count').textContent = AppState.applications.filter(a => companyJobIds.includes(a.jobId)).length;
    document.getElementById('company-hires-count').textContent = AppState.applications.filter(a => companyJobIds.includes(a.jobId) && a.status === 'accepted').length;
}

function editCompanyProfile() {
    const company = AppState.currentUser;
    document.getElementById('edit-company-hr-name').value = company.hrName || '';
    document.getElementById('edit-company-hr-id').value = company.hrId || '';
    document.getElementById('edit-company-hr-email').value = company.hrEmail || '';
    document.getElementById('edit-company-phone').value = company.phone || '';
    document.getElementById('edit-company-name').value = company.companyName || '';
    document.getElementById('edit-company-industry').value = company.industry || '';
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
    document.getElementById('opportunity-type').value = '';
    toggleOpportunityType(); // Call to reset required fields and display
    jobRequiredSkills = [];
    renderJobSkills();
    resetCollapsibleSections();
    customComponentCount = 0;
    document.querySelectorAll('.custom-salary-component-row').forEach(row => row.remove());
    calculateInHandSalary();
    showModal('job-form-modal');
}

function loadCompanyJobs() {
    const company = AppState.currentUser;
    const jobs = AppState.jobs.filter(j => j.companyId === company.id);

    const jobsList = document.getElementById('company-jobs-list');
    jobsList.innerHTML = jobs.length > 0 ? jobs.map(job => {
        const displayTitle = job.type === 'job' ? job.title : job.position;
        const displayPackage = job.type === 'job' ? `${job.salary ? job.salary.totalCtc : 'N/A'} LPA` : `${job.stipend || 'N/A'} /month`;
        const displayLocation = job.type === 'job' ? (job.locations ? job.locations.join(', ') : 'N/A') : 'N/A';
        const displayMinCgpa = job.eligibility ? job.eligibility.minCgpa : 'N/A';
        const displayDeadline = job.deadline || 'N/A';

        return `
            <div class="company-job-card">
                <div class="company-job-header">
                    <div>
                        <h3 class="job-title">${displayTitle}</h3>
                        <p class="job-company">${job.companyName}</p>
                    </div>
                    <span class="job-type ${new Date(job.deadline || '9999-12-31') >= new Date() ? 'active' : 'expired'}">${new Date(job.deadline || '9999-12-31') >= new Date() ? 'Active' : 'Expired'}</span>
                </div>
                <div class="job-stats">
                    <div class="job-stat">
                        <span class="job-stat-number">${job.applicants ? job.applicants.length : 0}</span>
                        <span class="job-stat-label">Applicants</span>
                    </div>
                    <div class="job-stat">
                        <span class="job-stat-number">${job.selected ? job.selected.length : 0}</span>
                        <span class="job-stat-label">Selected</span>
                    </div>
                </div>
                <div class="job-details">
                    <div class="job-detail"><strong>${job.type === 'job' ? 'Package' : 'Stipend'}:</strong> <span>${displayPackage}</span></div>
                    <div class="job-detail"><strong>Location:</strong> <span>${displayLocation}</span></div>
                    <div class="job-detail"><strong>Deadline:</strong> <span>${displayDeadline}</span></div>
                    <div class="job-detail"><strong>Min CGPA:</strong> <span>${displayMinCgpa}</span></div>
                </div>
                <div class="company-job-actions">
                    <button class="btn btn-primary btn-small" onclick="viewJobApplications('${job.id}')">View Applications</button>
                </div>
            </div>
        `;
    }).join('') : '<div class="empty-state"><h4>No Jobs Posted</h4><p>Post a new job to start receiving applications.</p></div>';
}

function loadCompanyStudents() {
    const deptFilter = document.getElementById('student-dept-filter-company').value;
    const minCgpa = parseFloat(document.getElementById('min-cgpa-company').value) || 0;
    const yearFilter = document.getElementById('year-filter-company').value;

    const students = AppState.students.filter(student => {
        const matchesDept = !deptFilter || student.department === deptFilter;
        const matchesCgpa = student.cgpa >= minCgpa;
        const matchesYear = !yearFilter || (student.year && student.year.toString() === yearFilter);
        return matchesDept && matchesCgpa && matchesYear;
    });

    const studentsGrid = document.getElementById('students-grid');
    studentsGrid.innerHTML = students.length > 0 ? students.map(student => `
        <div class="student-card">
            <div class="student-header">
                <div class="student-avatar">👤</div>
                <div class="student-info">
                    <h4>${student.name || 'N/A'}</h4>
                    <p>${student.course || 'N/A'} - ${student.department || 'N/A'} - Year ${student.year || 'N/A'}</p>
                </div>
            </div>
            <div class="student-details">
                <div class="student-detail"><strong>CGPA:</strong> <span>${student.cgpa || 'N/A'}</span></div>
                <div class="student-detail"><strong>Skills:</strong> <span>${student.skills ? student.skills.join(', ') : 'N/A'}</span></div>
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

    const companyJobIds = company.jobPostings || [];
    const applications = AppState.applications.filter(a => companyJobIds.includes(a.jobId) && (!statusFilter || a.status === statusFilter));

    const applicationsList = document.getElementById('job-applications-list');
    applicationsList.innerHTML = applications.length > 0 ? applications.map(app => {
        const student = AppState.students.find(s => s.id === app.studentId);
        const job = AppState.jobs.find(j => j.id === app.jobId);
        if (!student || !job) return '';

        const displayJobTitle = job.type === 'job' ? job.title : job.position;
        const studentSkills = student.skills ? student.skills.join(', ') : 'N/A';

        return `
            <div class="application-card">
                <div class="application-header">
                    <div class="application-info">
                        <h4>${student.name || 'N/A'} - ${displayJobTitle}</h4>
                        <p>${student.course || 'N/A'} - ${student.department || 'N/A'} | CGPA: ${student.cgpa || 'N/A'}</p>
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
                        <span>${app.coverLetter ? app.coverLetter.substring(0, 100) + '...' : 'N/A'}</span>
                    </div>
                    <div class="application-detail">
                        <strong>Skills:</strong>
                        <span>${studentSkills}</span>
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

function toggleOpportunityType() {
    const opportunityTypeSelect = document.getElementById('opportunity-type');
    const opportunityType = opportunityTypeSelect.value;
    const internshipSections = document.getElementById('internship-sections');
    const jobSections = document.getElementById('job-sections');

    // Hide both sections and disable/unrequire all their fields first
    internshipSections.style.display = 'none';
    jobSections.style.display = 'none';
    setRequiredFields('internship', false);
    setRequiredFields('job', false);

    if (opportunityType === 'internship') {
        internshipSections.style.display = 'block';
        setRequiredFields('internship', true);
    } else if (opportunityType === 'job') {
        jobSections.style.display = 'block';
        setRequiredFields('job', true);
    }

    resetCollapsibleSections();
}

// New function to set required/disabled status for fields within a section
function setRequiredFields(type, isRequired) {
    const sectionId = type === 'internship' ? 'internship-sections' : 'job-sections';
    const section = document.getElementById(sectionId);
    if (!section) return;

    const inputs = section.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        // Only set required/disabled if the field is not the main opportunity-type select itself
        // and if it's not already explicitly disabled by HTML (e.g., register form fields)
        if (input.id !== 'opportunity-type') {
            input.required = isRequired;
            input.disabled = !isRequired; // Disable if not required, enable if required
        }
    });
}


function setupCollapsibleSections() {
    const collapsibles = document.querySelectorAll('.collapsible-header');
    collapsibles.forEach(header => {
        header.removeEventListener('click', toggleCollapsible);
        header.addEventListener('click', toggleCollapsible);
    });
}

function toggleCollapsible() {
    this.classList.toggle('active');
    const content = this.nextElementSibling;
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

function resetCollapsibleSections() {
    const collapsibles = document.querySelectorAll('.collapsible-header');
    collapsibles.forEach(header => {
        header.classList.remove('active');
        const content = header.nextElementSibling;
        content.style.maxHeight = null;
    });
}

let jobRequiredSkills = [];
document.getElementById('job-required-skills').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const skillInput = this.value.trim();
        if (skillInput && !jobRequiredSkills.includes(skillInput)) {
            jobRequiredSkills.push(skillInput);
            renderJobSkills();
            this.value = '';
        }
    }
});

function renderJobSkills() {
    const skillsDisplay = document.getElementById('job-skills-display');
    skillsDisplay.innerHTML = '';
    jobRequiredSkills.forEach(skill => {
        const skillTag = document.createElement('span');
        skillTag.className = 'skill-tag';
        skillTag.innerHTML = `${skill} <button type="button" class="remove-skill" data-skill="${skill}">×</button>`;
        skillsDisplay.appendChild(skillTag);
    });

    skillsDisplay.querySelectorAll('.remove-skill').forEach(button => {
        button.addEventListener('click', function() {
            const skillToRemove = this.dataset.skill;
            jobRequiredSkills = jobRequiredSkills.filter(s => s !== skillToRemove);
            renderJobSkills();
        });
    });
}

document.getElementById('salary-breakdown-body').addEventListener('input', calculateInHandSalary);
document.getElementById('add-custom-salary-component').addEventListener('click', addCustomSalaryComponent);

function calculateInHandSalary() {
    let totalComponents = 0;
    document.querySelectorAll('.salary-component-amount').forEach(input => {
        totalComponents += parseFloat(input.value) || 0;
    });

    const totalCtc = parseFloat(document.getElementById('salary-total-ctc').value) || 0;
    const estimatedMonthlyInHand = (totalCtc * 100000 / 12) - totalComponents;

    document.getElementById('in-hand-salary-estimate').textContent = estimatedMonthlyInHand.toFixed(2);
}

let customComponentCount = 0;
function addCustomSalaryComponent() {
    customComponentCount++;
    const tbody = document.getElementById('salary-breakdown-body');
    const newRow = document.createElement('tr');
    newRow.className = 'custom-salary-component-row';
    newRow.innerHTML = `
        <td><input type="text" class="salary-component-name" data-component="custom-name-${customComponentCount}" placeholder="Other (custom field)"></td>
        <td><input type="number" class="salary-component-amount" data-component="custom-amount-${customComponentCount}" min="0"></td>
        <td><input type="text" class="salary-component-note" data-component="custom-note-${customComponentCount}" placeholder="Optional text"></td>
    `;
    tbody.appendChild(newRow);
    newRow.style.display = 'table-row';
    calculateInHandSalary();
}

function toggleMaternityPaternityDays() {
    const select = document.getElementById('leaves-maternity-paternity');
    const daysGroup = document.getElementById('maternity-paternity-days-group');
    if (select.value === 'yes') {
        daysGroup.style.display = 'block';
        daysGroup.querySelector('input').required = true;
    } else {
        daysGroup.style.display = 'none';
        daysGroup.querySelector('input').required = false;
        daysGroup.querySelector('input').value = '';
    }
}

function toggleMedicalInsuranceDetails() {
    const select = document.getElementById('benefits-medical-insurance');
    const detailsDiv = document.getElementById('medical-insurance-details');
    if (select.value === 'yes') {
        detailsDiv.style.display = 'block';
        detailsDiv.querySelectorAll('input, select').forEach(el => el.required = true);
    } else {
        detailsDiv.style.display = 'none';
        detailsDiv.querySelectorAll('input, select').forEach(el => {
            el.required = false;
            el.value = '';
        });
    }
}

function toggleBondDetails() {
    const select = document.getElementById('bond-required');
    const detailsDiv = document.getElementById('bond-details');
    if (select.value === 'yes') {
        detailsDiv.style.display = 'block';
        detailsDiv.querySelectorAll('input, select').forEach(el => el.required = true);
    } else {
        detailsDiv.style.display = 'none';
        detailsDiv.querySelectorAll('input, select').forEach(el => {
            el.required = false;
            el.value = '';
        });
    }
}

document.getElementById('job-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    const opportunityType = document.getElementById('opportunity-type').value;
    let jobData = {
        companyId: AppState.currentUser.id,
        companyName: AppState.currentUser.companyName,
        type: opportunityType,
        postedDate: new Date().toISOString().split('T')[0],
        applicants: [],
        selected: []
    };

    let isValid = true;

    if (opportunityType === 'internship') {
        jobData.position = document.getElementById('internship-position').value.trim();
        jobData.domain = document.getElementById('internship-domain').value.trim();
        jobData.openings = parseInt(document.getElementById('internship-openings').value);
        jobData.duration = document.getElementById('internship-duration').value;
        jobData.startDate = document.getElementById('internship-start-date').value;
        jobData.stipend = parseFloat(document.getElementById('internship-stipend').value);
        jobData.fulltimeOffer = document.getElementById('internship-fulltime-offer').value;
        jobData.companyContact = {
            name: document.getElementById('internship-company-name').value.trim(),
            address: document.getElementById('internship-registered-address').value.trim(),
            hrName: document.getElementById('internship-hr-name').value.trim(),
            hrDesignation: document.getElementById('internship-hr-designation').value.trim(),
            hrEmail: document.getElementById('internship-hr-email').value.trim()
        };

        if (!jobData.position || !jobData.domain || isNaN(jobData.openings) || jobData.openings <= 0 || !jobData.duration || !jobData.startDate || isNaN(jobData.stipend) || !jobData.fulltimeOffer || !jobData.companyContact.name || !jobData.companyContact.address || !jobData.companyContact.hrName || !jobData.companyContact.hrDesignation || !jobData.companyContact.hrEmail) {
            isValid = false;
            showError('Please fill in all required Internship fields.');
        }
    } else if (opportunityType === 'job') {
        jobData.title = document.getElementById('job-title-designation').value.trim();
        jobData.workType = document.getElementById('job-work-type').value;
        jobData.timings = document.getElementById('job-timings').value.trim();
        jobData.locations = Array.from(document.getElementById('job-locations').selectedOptions).map(option => option.value);
        jobData.totalOpenings = parseInt(document.getElementById('job-total-openings').value);
        jobData.skills = jobRequiredSkills;
        jobData.description = document.getElementById('job-description').value.trim();
        jobData.responsibilities = document.getElementById('job-responsibilities').value.trim();

        jobData.eligibility = {
            qualification: document.getElementById('eligibility-qualification').value.trim(),
            preferredCourses: Array.from(document.getElementById('eligibility-preferred-courses').selectedOptions).map(option => option.value),
            graduationYear: parseInt(document.getElementById('eligibility-graduation-year').value),
            minCgpa: parseFloat(document.getElementById('eligibility-min-cgpa').value)
        };

        jobData.salary = {
            totalCtc: parseFloat(document.getElementById('salary-total-ctc').value),
            breakdown: {},
            inHandEstimate: parseFloat(document.getElementById('in-hand-salary-estimate').textContent)
        };

        document.querySelectorAll('#salary-breakdown-body tr:not(.custom-salary-component-row) .salary-component-amount').forEach(input => {
            const componentName = input.dataset.component;
            jobData.salary.breakdown[componentName] = parseFloat(input.value) || 0;
        });

        document.querySelectorAll('#salary-breakdown-body tr:not(.custom-salary-component-row) .salary-component-note').forEach(input => {
            const componentName = input.dataset.component;
            jobData.salary.breakdown[`${componentName}-note`] = input.value.trim();
        });

        document.querySelectorAll('.custom-salary-component-row').forEach(row => {
            const nameInput = row.querySelector('.salary-component-name').value.trim();
            const amountInput = parseFloat(row.querySelector('.salary-component-amount').value) || 0;
            const noteInput = row.querySelector('.salary-component-note').value.trim();

            if (nameInput) {
                jobData.salary.breakdown[nameInput] = amountInput;
                if (noteInput) {
                    jobData.salary.breakdown[`${nameInput}-note`] = noteInput;
                }
            } else if (amountInput > 0 || noteInput) {
                isValid = false;
                showError('Custom salary components must have a valid name.');
            }
        });

        // Collect Leaves Policy data
        jobData.leaves = {
            total: parseInt(document.getElementById('leaves-total').value) || 0,
            cl: parseInt(document.getElementById('leaves-cl').value) || 0,
            sl: parseInt(document.getElementById('leaves-sl').value) || 0,
            el: parseInt(document.getElementById('leaves-el').value) || 0,
            carryForward: document.getElementById('leaves-carry-forward').value,
            maternityPaternity: document.getElementById('leaves-maternity-paternity').value,
            maternityPaternityDays: parseInt(document.getElementById('leaves-maternity-paternity-days').value) || 0,
            holidayList: document.getElementById('leaves-holiday-list').files[0] ? document.getElementById('leaves-holiday-list').files[0].name : '' // Store file name or handle upload
        };

        // Collect Benefits & Perks data
        jobData.benefits = {
            medicalInsurance: document.getElementById('benefits-medical-insurance').value,
            coverageAmount: parseFloat(document.getElementById('benefits-coverage-amount').value) || 0,
            familyIncluded: document.getElementById('benefits-family-included').value,
            wfh: document.getElementById('benefits-wfh').value,
            internetReimbursement: document.getElementById('benefits-internet-reimbursement').value,
            laptopProvided: document.getElementById('benefits-laptop-provided').value,
            dressCode: document.getElementById('benefits-dress-code').value.trim(),
            healthCheckups: document.getElementById('benefits-health-checkups').value
        };

        // Collect Bond / Agreement data
        jobData.bond = {
            required: document.getElementById('bond-required').value,
            durationValue: parseInt(document.getElementById('bond-duration-value').value) || 0,
            durationUnit: document.getElementById('bond-duration-unit').value,
            penaltyAmount: parseFloat(document.getElementById('bond-penalty-amount').value) || 0,
            backgroundCheck: document.getElementById('bond-background-check').value,
            probationPeriod: parseInt(document.getElementById('bond-probation-period').value) || 0,
            noticePeriod: parseInt(document.getElementById('bond-notice-period').value) || 0,
            nonCompete: document.getElementById('bond-non-compete').value
        };

        // Collect Company Details data
        jobData.companyDetails = {
            registeredAddress: document.getElementById('company-details-registered-address').value.trim(),
            hrContactPersonName: document.getElementById('company-details-hr-name').value.trim(),
            hrDesignation: document.getElementById('company-details-hr-designation').value.trim(),
            hrEmail: document.getElementById('company-details-hr-email').value.trim(),
            branchLocations: Array.from(document.getElementById('company-details-branch-locations').selectedOptions).map(option => option.value)
        };

        // Collect Attachments (only file names for now, actual upload logic needed)
        jobData.attachments = {
            jobDescriptionPdf: document.getElementById('attachments-job-description-pdf').files[0] ? document.getElementById('attachments-job-description-pdf').files[0].name : '',
            salaryStructurePdf: document.getElementById('attachments-salary-structure-pdf').files[0] ? document.getElementById('attachments-salary-structure-pdf').files[0].name : '',
            leavePolicyPdf: document.getElementById('attachments-leave-policy-pdf').files[0] ? document.getElementById('attachments-leave-policy-pdf').files[0].name : '',
            bondCopy: document.getElementById('attachments-bond-copy').files[0] ? document.getElementById('attachments-bond-copy').files[0].name : '',
            medicalInsuranceTerms: document.getElementById('attachments-medical-insurance-terms').files[0] ? document.getElementById('attachments-medical-insurance-terms').files[0].name : ''
        };

        // Collect Bonus (Optional Fields) data
        jobData.bonus = {
            growthOpportunities: document.getElementById('bonus-growth-opportunities').value.trim(),
            travelRequirements: document.getElementById('bonus-travel-requirements').value.trim(),
            idEmailSetupTimeline: document.getElementById('bonus-id-email-setup-timeline').value.trim(),
            onboardingProcess: document.getElementById('bonus-onboarding-process').value.trim()
        };

        // Basic validation for job fields
        if (!jobData.title || !jobData.workType || jobData.locations.length === 0 || isNaN(jobData.totalOpenings) || jobData.totalOpenings <= 0 || jobData.skills.length === 0 || !jobData.description || !jobData.responsibilities || !jobData.eligibility.qualification || jobData.eligibility.preferredCourses.length === 0 || isNaN(jobData.eligibility.graduationYear) || isNaN(jobData.eligibility.minCgpa) || isNaN(jobData.salary.totalCtc) || !jobData.companyDetails.registeredAddress || !jobData.companyDetails.hrContactPersonName || !jobData.companyDetails.hrDesignation || !jobData.companyDetails.hrEmail) {
            isValid = false;
            showError('Please fill in all required Job fields.');
        }

        if (jobData.salary.totalCtc < 0) {
            isValid = false;
            showError('Total CTC must be a positive number.');
        }
    } else {
        isValid = false;
        showError('Please select an opportunity type.');
    }

    if (jobData.skills && jobData.skills.length === 0) { // Check if skills array exists and is empty
        isValid = false;
        showError('At least one required skill must be specified.');
    }

    // Add a deadline field to the job form in index.html and collect it here
    // For now, I'll add a placeholder deadline to avoid immediate errors if not present
    jobData.deadline = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]; // Default to 1 year from now

    // You might want to add a deadline input field in your HTML for jobs
    // <div class="form-group">
    //     <label for="job-deadline">Application Deadline <span class="required">*</span></label>
    //     <input type="date" id="job-deadline" required>
    // </div>
    // And then collect it like: jobData.deadline = document.getElementById('job-deadline').value;

    if (!jobData.deadline || new Date(jobData.deadline) < new Date()) {
        isValid = false;
        showError('Please provide a valid future deadline.');
    }


    if (isValid) {
        try {
            AppState.postJob(jobData);
            closeModal('job-form-modal');
            loadCompanyJobs();
            showSuccess('Job posted successfully!');
            document.getElementById('job-form').reset();
            jobRequiredSkills = [];
            renderJobSkills();
            resetCollapsibleSections();
            customComponentCount = 0;
            document.querySelectorAll('.custom-salary-component-row').forEach(row => row.remove());
            calculateInHandSalary();
        } catch (error) {
            console.error('Error posting job:', error);
            showError('An error occurred while posting the job. Please try again.');
        }
    }

    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
});

// Splash Screen Logic
document.addEventListener('DOMContentLoaded', function() {
    AppState.init();
    setupCollapsibleSections(); // Initialize collapsible sections on DOM load
    
    // Show splash screen initially
    const splashScreen = document.getElementById('splash-screen');
    
    // Hide splash screen after 7 seconds and show landing page
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        showPage('landing-page');
    }, 6000);
});
