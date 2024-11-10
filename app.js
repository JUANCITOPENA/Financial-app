let currentSlide = 0;
const slides = document.querySelectorAll('.slide');

function changeSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}

setInterval(changeSlide, 5000); // Cambia de imagen cada 5 segundos

let financialData = null;
let charts = []; // Para almacenar instancias de gráficos si estás usando Chart.js

// Cargar datos desde JSON y actualizar dashboard
async function loadData(showAlert = true) {
    try {
        const response = await fetch('data.json?' + new Date().getTime()); // Evita el caché
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        financialData = await response.json();
        saveToLocalStorage();
        renderDashboard(); // Actualiza el dashboard con los nuevos datos
    } catch (error) {
        console.error("Could not load the data:", error);
        if (showAlert) {
            alert("Error loading data. Please check the console for more information.");
        }
    }
}

// Función para actualización periódica
function startAutoRefresh(interval = 5000) { // 5 segundos por defecto
    setInterval(() => {
        loadData(false); // No mostrar alerta en actualizaciones automáticas
    }, interval);
}

// Llama a startAutoRefresh para iniciar el auto-refresh
startAutoRefresh();

function saveToLocalStorage() {
    localStorage.setItem('financialData', JSON.stringify(financialData));
}

function getFromLocalStorage() {
    const storedData = localStorage.getItem('financialData');
    return storedData ? JSON.parse(storedData) : null;
}

// Renderizar el dashboard y reiniciar gráficos
function renderDashboard() {
    if (!financialData) {
        console.error("No financial data available");
        return;
    }

    resetCharts(); // Destruye gráficos previos antes de crear nuevos
    updateBalanceCards();
    renderTransactions();
    renderBudgets();
    renderKPIs();
    createCharts(); // Vuelve a crear los gráficos con los nuevos datos
}

// Función para resetear los gráficos
function resetCharts() {
    charts.forEach(chart => chart.destroy()); // Destruye cada gráfico si estás usando Chart.js
    charts = []; // Reinicia el array de gráficos para los nuevos datos
}

// Actualiza las tarjetas de balance
function updateBalanceCards() {
    document.getElementById('balance').textContent = `$${financialData.balance.toFixed(2)}`;
    document.getElementById('income').textContent = `$${financialData.income.toFixed(2)}`;
    document.getElementById('expenses').textContent = `$${financialData.expenses.toFixed(2)}`;
}

// Renderiza las transacciones
function renderTransactions() {
    const container = document.getElementById('transactionsContainer');
    container.innerHTML = ''; // Limpia las transacciones previas
    financialData.transactions.forEach((transaction, index) => {
        if (index < 8) {
            const card = document.createElement('div');
            card.className = 'col-md-3 mb-3';
            
            const [year, month, day] = transaction.date.split('-');
            const date = new Date(year, month - 1, day);
            
            card.innerHTML = `
                <div class="card transaction-card">
                    <div class="card-body">
                        <h5 class="card-title">${transaction.description}</h5>
                        <p class="card-text">${date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p class="amount ${transaction.type === 'income' ? 'positive' : 'negative'}">
                            ${transaction.type === 'income' ? '+' : '-'}$${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        }
    });
}

// Renderiza los presupuestos
function renderBudgets() {
    const container = document.getElementById('budgetsContainer');
    container.innerHTML = ''; // Limpia los presupuestos previos
    
    financialData.budgets.forEach(budget => {
        const percentage = (budget.spent / budget.limit) * 100;
        const percentageText = percentage.toFixed(1) + '%';
        const card = document.createElement('div');
        card.className = 'col-md-3 mb-3';
        
        let progressBarClass = 'bg-success';
        let textColor = 'text-white';
        
        if (percentage > 90) {
            progressBarClass = 'bg-danger';
        } else if (percentage > 70) {
            progressBarClass = 'bg-warning';
            textColor = 'text-dark';
        }
        
        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${budget.category}</h5>
                    <p class="card-text">${percentageText}</p>
                    <div class="progress">
                        <div class="progress-bar ${progressBarClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Añade aquí las funciones renderKPIs y createCharts, asegurándote de que createCharts guarde las instancias en `charts`.

function renderKPIs() {
    const tableBody = document.getElementById('kpiTableBody');
    tableBody.innerHTML = '';
    financialData.kpis.forEach(kpi => {
        const row = document.createElement('tr');
        let status;
        if (kpi.name === 'Tasa de Ahorro') {
            status = kpi.value >= 20 ? 'good' : kpi.value >= 10 ? 'warning' : 'bad';
        } else if (kpi.name === 'Relación Deuda-Ingreso') {
            status = kpi.value <= 0.3 ? 'good' : kpi.value <= 0.4 ? 'warning' : 'bad';
        } else if (kpi.name === 'Cobertura del Fondo de Emergencia') {
            status = kpi.value >= 6 ? 'good' : kpi.value >= 3 ? 'warning' : 'bad';
        }
        row.innerHTML = `
            <td>${kpi.name}</td>
            <td>${kpi.value}${kpi.unit}</td>
            <td><span class="kpi-status ${status}">${status === 'good' ? 'BUENO' : status === 'warning' ? 'PRECAUCIÓN' : 'MALO'}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

function createCharts() {
    createIncomeExpensesChart();
    createExpensesDistributionChart();
}

function createIncomeExpensesChart() {
    const ctx = document.getElementById('incomeExpensesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{
                label: 'Monto',
                data: [financialData.income, financialData.expenses],
                backgroundColor: ['rgba(76, 175, 80, 0.6)', 'rgba(244, 67, 54, 0.6)'],
                borderColor: ['rgba(76, 175, 80, 1)', 'rgba(244, 67, 54, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function createExpensesDistributionChart() {
    const expensesByCategory = {};
    financialData.transactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            expensesByCategory[transaction.category] = (expensesByCategory[transaction.category] || 0) + Math.abs(transaction.amount);
        }
    });

    const ctx = document.getElementById('expensesDistributionChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Agregar botón de actualización manual
function addRefreshButton() {
    const header = document.querySelector('header');
    const refreshButton = document.createElement('button');
    refreshButton.className = 'btn btn-primary mt-2';
    refreshButton.innerHTML = '🔄 Actualizar Datos';
    refreshButton.onclick = () => loadData(true);
    header.appendChild(refreshButton);
}


document.addEventListener('DOMContentLoaded', () => {
    const storedData = getFromLocalStorage();
    if (storedData) {
        financialData = storedData;
        renderDashboard();
    } else {
        loadData();
    }
});

