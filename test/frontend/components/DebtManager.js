import React, { useState } from 'react';

// Helper: Proper debt ordering for display and payoff schedule
function orderDebts(debts, method) {
  if (method === 'Avalanche') {
    return debts.slice().sort((a, b) => b.interest_rate - a.interest_rate);
  }
  if (method === 'Snowball') {
    return debts.slice().sort((a, b) => a.principal - b.principal);
  }
  return debts;
}

// Accurate payoff simulation for Avalanche/Snowball
function simulatePayoff(debts, extraMonthly, method) {
  let debtList = debts.map(d => ({
    ...d,
    remaining: d.principal,
    min_payment: +d.min_payment || +d.emi,
    paid: false
  }));

  let schedule = [];
  let history = [];
  let month = 0;
  let totalInterest = 0;
  const sorter = method === 'Avalanche'
    ? (a, b) => b.interest_rate - a.interest_rate
    : (a, b) => a.remaining - b.remaining;

  while (debtList.some(d => d.remaining > 0) && month < 600) {
    debtList = debtList.sort(sorter);
    let snowball = +extraMonthly;
    debtList.forEach(d => {
      if (d.paid && d.min_payment > 0) snowball += d.min_payment;
    });
    for (let i = 0; i < debtList.length; i++) {
      let d = debtList[i];
      if (d.paid) continue;
      let payment = d.min_payment;
      if (i === 0) payment += snowball; // All extra goes to top-priority debt
      payment = Math.min(payment, d.remaining + (d.remaining * d.interest_rate / 12 / 100));
      let interest = d.remaining * d.interest_rate / 12 / 100;
      totalInterest += d.remaining > 0 ? interest : 0;
      let principalPayment = payment - interest;
      if (principalPayment > d.remaining) principalPayment = d.remaining;
      d.remaining -= principalPayment;
      if (d.remaining <= 0.01) {
        d.remaining = 0;
        d.paid = true;
        schedule.push({
          debt_type: d.debt_type,
          payoffMonth: month + 1,
          paidInterest: totalInterest.toFixed(2)
        });
      }
    }
    history.push(debtList.map(d => ({ debt_type: d.debt_type, remaining: d.remaining })));
    month++;
  }
  return {
    months: month,
    totalInterest: totalInterest.toFixed(2),
    payoffSchedule: schedule,
    paymentHistory: history
  };
}

function DebtManager() {
  const [debts, setDebts] = useState([]);
  const [newDebt, setNewDebt] = useState({
    debt_type: '', principal: '', interest_rate: '', min_payment: '',
    emi: '', tenure_months: ''
  });
  const [extraMonthly, setExtraMonthly] = useState('');
  const [repaymentMethod, setRepaymentMethod] = useState('Avalanche');
  const [results, setResults] = useState(null);

  const handleDebtChange = e => setNewDebt({ ...newDebt, [e.target.name]: e.target.value });
  const handleAddDebt = e => {
    e.preventDefault();
    if (!newDebt.debt_type || !newDebt.principal) return;
    setDebts([...debts, {
      ...newDebt,
      principal: Number(newDebt.principal),
      interest_rate: Number(newDebt.interest_rate),
      min_payment: Number(newDebt.min_payment),
      emi: Number(newDebt.emi),
      tenure_months: Number(newDebt.tenure_months)
    }]);
    setNewDebt({
      debt_type: '', principal: '', interest_rate: '', min_payment: '',
      emi: '', tenure_months: ''
    });
  };
  const removeDebt = idx => setDebts(debts.filter((_, i) => i !== idx));

  const arrangedDebts = orderDebts(debts, repaymentMethod);

  const calculateSchedule = () => {
    const res = simulatePayoff(arrangedDebts, extraMonthly, repaymentMethod);
    setResults(res);
  };

  return (
    <div style={{ maxWidth: 900, margin: '48px auto', padding: 24, background: 'white', borderRadius: 10 }}>
      <h2>Debt Payoff Manager</h2>
      <form onSubmit={handleAddDebt}>
        <table style={{ width: '100%', marginBottom: 24, borderSpacing: 8 }}>
          <thead>
            <tr>
              <th>Debt Name</th>
              <th>Balance</th>
              <th>Interest&nbsp;%</th>
              <th>Min Payment</th>
              <th>EMI (if loan)</th>
              <th>Months</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {arrangedDebts.map((d, idx) => (
              <tr key={idx}>
                <td>{d.debt_type}</td>
                <td>₹{d.principal}</td>
                <td>{d.interest_rate}%</td>
                <td>₹{d.min_payment}</td>
                <td>₹{d.emi}</td>
                <td>{d.tenure_months}</td>
                <td>
                  <button type="button" onClick={() => removeDebt(idx)}>Remove</button>
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input name="debt_type" value={newDebt.debt_type} onChange={handleDebtChange} required />
              </td>
              <td>
                <input name="principal" value={newDebt.principal} type="number" min="1" onChange={handleDebtChange} required />
              </td>
              <td>
                <input name="interest_rate" value={newDebt.interest_rate} type="number" min="0" onChange={handleDebtChange} required />
              </td>
              <td>
                <input name="min_payment" value={newDebt.min_payment} type="number" min="0" onChange={handleDebtChange} />
              </td>
              <td>
                <input name="emi" value={newDebt.emi} type="number" min="0" onChange={handleDebtChange} />
              </td>
              <td>
                <input name="tenure_months" value={newDebt.tenure_months} type="number" min="0" onChange={handleDebtChange} />
              </td>
              <td>
                <button type="submit">Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>

      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        <label>
          Extra Monthly Payment:
          <input type="number" value={extraMonthly} onChange={e => setExtraMonthly(e.target.value)} style={{ width: 80, marginLeft: 8 }} />
        </label>
        <label>
          Strategy:
          <select value={repaymentMethod} onChange={e => setRepaymentMethod(e.target.value)}>
            <option value="Avalanche">Avalanche (Highest Interest)</option>
            <option value="Snowball">Snowball (Smallest Balance)</option>
          </select>
        </label>
        <button onClick={calculateSchedule} style={{ marginLeft: 12 }}>Calculate</button>
      </div>

      {results && (
        <div>
          <h3>Repayment Plan Summary</h3>
          <div>
            <strong>Months to Debt-Free:</strong> {results.months}
          </div>
          <div>
            <strong>Total Interest Paid:</strong> ₹{results.totalInterest}
          </div>
          <table style={{ width: '100%', marginTop: 18, borderSpacing: 4 }}>
            <thead>
              <tr>
                <th>Debt</th>
                <th>Payoff Month</th>
                <th>Paid Interest</th>
              </tr>
            </thead>
            <tbody>
              {results.pay
