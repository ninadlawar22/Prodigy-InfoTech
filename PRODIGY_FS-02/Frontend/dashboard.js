const API_URL = "http://localhost:5000/api/employees";
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

let employees = [];

async function fetchEmployees() {
    const response = await fetch(API_URL, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    employees = await response.json();
    displayEmployees(employees);
}

function displayEmployees(data) {
    const table = document.getElementById("employeeTable");
    table.innerHTML = "";

    data.forEach((emp) => {
        table.innerHTML += `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.name}</td>
                <td>${emp.email}</td>
                <td>${emp.phone}</td>
                <td>${emp.department}</td>
                <td>₹${emp.salary}</td>
                <td>
                    <button class="edit-btn" onclick="editEmployee(${emp.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteEmployee(${emp.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function saveEmployee() {
    const id = document.getElementById("employeeId").value;
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const department = document.getElementById("department").value;
    const salary = document.getElementById("salary").value;
    const msg = document.getElementById("msg");

    if (!name || !email || !phone || !department || !salary) {
        msg.innerText = "All fields are required";
        return;
    }

    if (!email.includes("@")) {
        msg.innerText = "Enter valid email";
        return;
    }

    if (phone.length < 10) {
        msg.innerText = "Phone number must be at least 10 digits";
        return;
    }

    const employee = { name, email, phone, department, salary };

    let method = "POST";
    let url = API_URL;

    if (id) {
        method = "PUT";
        url = `${API_URL}/${id}`;
    }

    const response = await fetch(url, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(employee)
    });

    const data = await response.json();
    msg.innerText = data.message;

    clearForm();
    fetchEmployees();
}

function editEmployee(id) {
    const emp = employees.find(e => e.id === id);

    document.getElementById("employeeId").value = emp.id;
    document.getElementById("name").value = emp.name;
    document.getElementById("email").value = emp.email;
    document.getElementById("phone").value = emp.phone;
    document.getElementById("department").value = emp.department;
    document.getElementById("salary").value = emp.salary;

    document.getElementById("formTitle").innerText = "Update Employee";
    document.getElementById("saveBtn").innerText = "Update Employee";
}

async function deleteEmployee(id) {
    const confirmDelete = confirm("Are you sure you want to delete this employee?");

    if (!confirmDelete) {
        return;
    }

    await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    fetchEmployees();
}

function searchEmployee() {
    const searchValue = document.getElementById("searchInput").value.toLowerCase();

    const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchValue) ||
        emp.email.toLowerCase().includes(searchValue) ||
        emp.department.toLowerCase().includes(searchValue)
    );

    displayEmployees(filtered);
}

function clearForm() {
    document.getElementById("employeeId").value = "";
    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("department").value = "";
    document.getElementById("salary").value = "";

    document.getElementById("formTitle").innerText = "Add Employee";
    document.getElementById("saveBtn").innerText = "Add Employee";
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

fetchEmployees();
