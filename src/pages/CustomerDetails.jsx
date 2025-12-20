import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/customer.css';
import { User, RefreshCw, ArrowRight } from 'lucide-react';

const CustomerDetails = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    address: '',
    attender: '',
    attenderPhone: '' // Added state
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setFormData({
      fullname: '',
      phone: '',
      address: '',
      attender: '',
      attenderPhone: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullname, phone, address, attender, attenderPhone } = formData;

    if (!fullname || !phone || !address || !attender || !attenderPhone) {
      alert('Please fill all required fields.');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit customer phone number.');
      return;
    }
    if (!/^\d{10}$/.test(attenderPhone)) {
      alert('Please enter a valid 10-digit attender phone number.');
      return;
    }

    const payload = {
      fullname,
      phone,
      address,
      attender,
      attenderPhone,
      createdAt: new Date().toISOString()
    };

    // Removed immediate backend save.
    // Data is stored in session/local storage and will be saved to backend
    // when "Final Summary Calculation" is clicked in the Calculator page.

    sessionStorage.setItem('customer', JSON.stringify(payload));

    localStorage.setItem('customerData', JSON.stringify({
      name: fullname,
      mobile: phone,
      address: address,
      attender: attender,
      attenderMobile: attenderPhone
    }));

    navigate('/calculator');
  };

  return (
    <main className="page">
      <div className="page-inner">
        <div className="heading">
          <div className="avatar">
            <User size={28} color="#29513B" />
          </div>
          <h1>Customer Details</h1>
          <p className="subtitle">Please provide your information to begin your tile visualization journey</p>
        </div>

        <section className="card">
          <form id="customerForm" className="form" autoComplete="off" onSubmit={handleSubmit}>
            <div className="section">
              <div className="section-title">
                <div className="step">1</div>
                <div>Customer Information</div>
              </div>

              <label className="field">
                <span className="label-text">Full Name <span className="required">*</span></span>
                <input
                  type="text"
                  name="fullname"
                  id="fullname"
                  placeholder="Enter customer's full name"
                  required
                  value={formData.fullname}
                  onChange={handleChange}
                />
                <small className="hint">As per official documents</small>
              </label>

              <label className="field">
                <span className="label-text">Phone Number <span className="required">*</span></span>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  pattern="[0-9]{10}"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                />
                <small className="hint">We'll use this for order updates</small>
              </label>

              <label className="field">
                <span className="label-text">Address <span className="required">*</span></span>
                <textarea
                  name="address"
                  id="address"
                  rows="3"
                  placeholder="Enter complete address with landmark"
                  required
                  value={formData.address}
                  onChange={handleChange}
                ></textarea>
                <small className="hint">Include street, area, and city</small>
              </label>
            </div>

            <div className="section">
              <div className="section-title">
                <div className="step">2</div>
                <div>Assign Sales Representative</div>
              </div>

              <label className="field">
                <span className="label-text">Select Attender <span className="required">*</span></span>
                <select
                  name="attender"
                  id="attender"
                  required
                  value={formData.attender}
                  onChange={handleChange}
                >
                  <option value="">Choose a sales representative</option>
                  <option value="Arun">Arun</option>
                  <option value="Deepa">Deepa</option>
                  <option value="Ramesh">Ramesh</option>
                  <option value="Suresh">Suresh</option>
                </select>
                <small className="hint">Select the company representative assisting this customer</small>
              </label>

              <label className="field">
                <span className="label-text">Attender Mobile Number <span className="required">*</span></span>
                <input
                  type="tel"
                  name="attenderPhone"
                  id="attenderPhone"
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  pattern="[0-9]{10}"
                  required
                  value={formData.attenderPhone}
                  onChange={handleChange}
                />
                <small className="hint">Contact number for the sales representative</small>
              </label>
            </div>

            <div className="actions">
              <button type="button" id="resetBtn" className="btn-outline" onClick={handleReset}>
                <RefreshCw size={16} style={{ marginRight: '8px', display: 'inline' }} /> Reset Form
              </button>
              <button type="submit" className="btn-primary" id="continueBtn">
                Continue to Home <ArrowRight size={16} style={{ marginLeft: '8px', display: 'inline' }} />
              </button>
            </div>
          </form>
        </section>

        <p className="terms">By continuing, you agree to JAI THINDAL TILES terms of service</p>
      </div>
    </main>
  );
};

export default CustomerDetails;
