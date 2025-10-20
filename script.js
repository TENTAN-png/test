document.addEventListener('DOMContentLoaded', () => {
    const debtForm = document.getElementById('debt-form');
    const debtsTableBody = document.querySelector('#debts-table tbody');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsContainer = document.getElementById('results-container');
    const avalancheTableBody = document.querySelector('#avalanche-table tbody');
    const snowballTableBody = document.querySelector('#snowball-table tbody');
    const avalancheSummary = document.getElementById('avalanche-summary');
    const snowballSummary = document.getElementById('snowball-summary');

    let debts = [];

    debtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const debtName = document.getElementById('debt-name').value;
        const principal = parseFloat(document.getElementById('principal').value);
        const interestRate = parseFloat(document.getElementById('interest-rate').value);
        const minPayment = parseFloat(document.getElementById('min-payment').value);

        const debt = {
            name: debtName,
            principal: principal,
            interestRate: interestRate,
            minPayment: minPayment,
            id: Date.now()
        };

        debts.push(debt);
        renderDebts();
        debtForm.reset();
    });

    function renderDebts() {
        debtsTableBody.innerHTML = '';
        debts.forEach(debt => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${debt.name}</td>
                <td>${debt.principal.toFixed(2)}</td>
                <td>${debt.interestRate.toFixed(2)}</td>
                <td>${debt.minPayment.toFixed(2)}</td>
                <td><button class="remove-btn" data-id="${debt.id}">Remove</button></td>
            `;
            debtsTableBody.appendChild(row);
        });
    }

    debtsTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            debts = debts.filter(debt => debt.id !== id);
            renderDebts();
        }
    });

    calculateBtn.addEventListener('click', () => {
        const extraPayment = parseFloat(document.getElementById('extra-payment').value) || 0;
        if (debts.length > 0) {
            calculateRepayment('avalanche', extraPayment);
            calculateRepayment('snowball', extraPayment);
            resultsContainer.classList.remove('hidden');
        } else {
            alert('Please add at least one debt.');
        }
    });

    function calculateRepayment(strategy, extraPayment) {
        let localDebts = JSON.parse(JSON.stringify(debts)); // Deep copy to avoid modifying original array
        let totalMinPayment = localDebts.reduce((sum, debt) => sum + debt.minPayment, 0);
        let totalPayment = totalMinPayment + extraPayment;

        if (strategy === 'avalanche') {
            localDebts.sort((a, b) => b.interestRate - a.interestRate);
        } else if (strategy === 'snowball') {
            localDebts.sort((a, b) => a.principal - b.principal);
        }

        let schedule = [];
        let month = 0;
        let totalInterestPaid = 0;
        let activeDebts = localDebts.filter(debt => debt.principal > 0);

        while (activeDebts.length > 0) {
            month++;
            let monthPayment = totalPayment;
            let monthInterest = 0;
            let monthPrincipalPaid = 0;

            activeDebts.forEach((debt, index) => {
                const monthlyInterest = (debt.principal * (debt.interestRate / 100)) / 12;
                monthInterest += monthlyInterest;
                totalInterestPaid += monthlyInterest;
                debt.principal += monthlyInterest;

                let payment = debt.minPayment;
                if (index === 0) {
                    let remainingPaymentForFocusDebt = monthPayment;
                    activeDebts.slice(1).forEach(d => remainingPaymentForFocusDebt -= d.minPayment);
                    payment = Math.min(debt.principal, remainingPaymentForFocusDebt);
                }

                debt.principal -= payment;
                monthPrincipalPaid += payment;
                monthPayment -= payment;
            });

            schedule.push({
                month: month,
                startingBalance: activeDebts.reduce((sum, d) => sum + d.principal, 0) + monthPrincipalPaid,
                payment: totalPayment,
                interestPaid: monthInterest,
                principalPaid: monthPrincipalPaid,
                endingBalance: activeDebts.reduce((sum, d) => sum + d.principal, 0),
            });

            activeDebts = activeDebts.filter(debt => debt.principal > 0);

            // Re-calculate total payment as minimums change when debts are paid off
            if(activeDebts.length < localDebts.length) {
                totalMinPayment = activeDebts.reduce((sum, debt) => sum + debt.minPayment, 0);
                 const paidOffDebts = localDebts.filter(d => !activeDebts.some(ad => ad.id === d.id));
                 const freedUpPayment = paidOffDebts.reduce((sum, d) => sum + d.minPayment, 0);
                 totalPayment = totalMinPayment + extraPayment + freedUpPayment;
            }

        }
         if (strategy === 'avalanche') {
            displayResults(schedule, avalancheTableBody, avalancheSummary, month, totalInterestPaid);
        } else if (strategy === 'snowball') {
            displayResults(schedule, snowballTableBody, snowballSummary, month, totalInterestPaid);
        }
    }
     function displayResults(schedule, tableBody, summaryElement, totalMonths, totalInterest) {
        tableBody.innerHTML = '';
        schedule.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.month}</td>
                <td>${row.startingBalance.toFixed(2)}</td>
                <td>${row.payment.toFixed(2)}</td>
                <td>${row.interestPaid.toFixed(2)}</td>
                <td>${row.principalPaid.toFixed(2)}</td>
                <td>${row.endingBalance.toFixed(2)}</td>
            `;
            tableBody.appendChild(tr);
        });

        summaryElement.innerHTML = `
            <p><strong>Time to be Debt-Free:</strong> ${totalMonths} months</p>
            <p><strong>Total Interest Paid:</strong> ₹${totalInterest.toFixed(2)}</p>
        `;
    }
});