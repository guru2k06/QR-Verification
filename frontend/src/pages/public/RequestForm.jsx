import { useState } from 'react';
import apiClient from '../../api/client';

const initialForm = {
  recipientName: '',
  email: '',
  course: '',
  issueDate: '',
  issuer: '',
  certificateType: '',
  notes: '',
};

const courseOptions = [
  { value: '', label: 'Select a course or program' },
  { value: 'Web Development', label: 'Web Development' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Cybersecurity', label: 'Cybersecurity' },
  { value: 'UI/UX Design', label: 'UI/UX Design' },
  { value: 'Cloud Computing', label: 'Cloud Computing' },
];

const organizationOptions = [
  { value: '', label: 'Select issuing organization' },
  { value: 'Northbridge Institute', label: 'Northbridge Institute' },
  { value: 'Metro Skills Academy', label: 'Metro Skills Academy' },
  { value: 'Global Learning Center', label: 'Global Learning Center' },
  { value: 'Professional Training Hub', label: 'Professional Training Hub' },
];

const certificateTypeOptions = [
  { value: '', label: 'Select certificate type' },
  { value: 'Completion', label: 'Completion' },
  { value: 'Participation', label: 'Participation' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Achievement', label: 'Achievement' },
];

export default function RequestForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'idle', message: '' });

    try {
      await apiClient.post('/certificates/request', form);
      setForm(initialForm);
      setStatus({ type: 'success', message: 'Request submitted. An admin will review it shortly.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.response?.data?.message || 'Unable to submit request right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid two-col">
      <article className="hero-card">
        <p className="eyebrow">Public submission</p>
        <h2>Submit a certificate request.</h2>
        <p className="muted-copy">Provide the fields needed to issue and verify the certificate later.</p>
      </article>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Recipient name
            <input name="recipientName" value={form.recipientName} onChange={handleChange} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Course / Program title
            <select name="course" value={form.course} onChange={handleChange} required>
              {courseOptions.map((option) => (
                <option key={option.value || 'placeholder'} value={option.value} disabled={!option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Issue date
            <input type="date" name="issueDate" value={form.issueDate} onChange={handleChange} required />
          </label>
          <label>
            Issuing organization
            <select name="issuer" value={form.issuer} onChange={handleChange} required>
              {organizationOptions.map((option) => (
                <option key={option.value || 'placeholder'} value={option.value} disabled={!option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Purpose / certificate type
            <select name="certificateType" value={form.certificateType} onChange={handleChange} required>
              {certificateTypeOptions.map((option) => (
                <option key={option.value || 'placeholder'} value={option.value} disabled={!option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Notes
            <textarea name="notes" rows="4" value={form.notes} onChange={handleChange} placeholder="Optional context for the admin reviewer" />
          </label>
        </div>

        {status.message ? <div className={`inline-alert ${status.type}`}>{status.message}</div> : null}

        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit request'}
        </button>
      </form>
    </section>
  );
}
