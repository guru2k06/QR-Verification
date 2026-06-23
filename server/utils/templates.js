const certificateTemplate = `<!DOCTYPE html>
<html>
<head>
<style>
body{
    font-family: Georgia, serif;
    padding:50px;
    border:10px solid #1e3a8a;
}
.title{
    text-align:center;
    font-size:32px;
    font-weight:bold;
}
.content{
    margin-top:40px;
    font-size:18px;
    line-height:1.8;
}
.footer{
    margin-top:80px;
    display:flex;
    justify-content:space-between;
}
</style>
</head>
<body>

<div class="title">ACADEMIC CERTIFICATE</div>

<div class="content">
This is to certify that <b>{{student_name}}</b>
(Roll No: <b>{{roll_number}}</b>) has successfully completed the
<b>{{course}}</b> program at
<b>{{institution}}</b>.

The student secured <b>{{grade_cgpa}}</b>
and passed in the year <b>{{year_of_passing}}</b>.
</div>

<div class="footer">
<div>
Issue Date: {{issue_date}}
</div>

<div>
Issuer Authority<br>
{{issuer_authority}}
</div>
</div>

</body>
</html>`;

const offerLetterTemplate = `<!DOCTYPE html>
<html>
<head>
<style>
body{
    font-family: Arial;
    padding:40px;
}
.header{
    text-align:center;
}
.title{
    font-size:28px;
    font-weight:bold;
}
.content{
    margin-top:30px;
    line-height:1.8;
}
.signature{
    margin-top:60px;
}
</style>
</head>
<body>

<div class="header">
<h1>{{company}}</h1>
<div class="title">OFFER LETTER</div>
</div>

<div class="content">
Dear <b>{{employee_name}}</b>,

We are pleased to offer you the position of
<b>{{designation}}</b> at <b>{{company}}</b>.

Your employment shall commence on
<b>{{joining_date}}</b>.

We look forward to welcoming you to our team.
</div>

<div class="signature">
Issuer Authority: {{issuer_authority}}<br>
Issue Date: {{issue_date}}
</div>

</body>
</html>`;

const experienceLetterTemplate = `<!DOCTYPE html>
<html>
<head>
<style>
body{
    font-family: Arial;
    padding:40px;
}
</style>
</head>
<body>

<h1 style="text-align:center;">EXPERIENCE LETTER</h1>

<p>
This is to certify that
<b>{{employee_name}}</b>
worked with <b>{{company}}</b> as
<b>{{designation}}</b> from
<b>{{joining_date}}</b> to
<b>{{relieving_date}}</b>.
</p>

<p>
During this tenure, the employee demonstrated professionalism and dedication.
</p>

<br><br>

Issuer Authority: {{issuer_authority}}<br>
Issue Date: {{issue_date}}

</body>
</html>`;

const medicalTemplate = `<!DOCTYPE html>
<html>
<head>
<style>
body{
    font-family: Arial;
    padding:30px;
}
.report-box{
    border:2px solid #333;
    padding:20px;
}
</style>
</head>
<body>

<h2 style="text-align:center;">MEDICAL REPORT</h2>

<div class="report-box">

<p><b>Patient Name:</b> {{patient_name}}</p>

<p><b>Hospital:</b> {{hospital}}</p>

<p><b>Report Type:</b> {{report_type}}</p>

<p><b>Report Date:</b> {{report_date}}</p>

<p><b>Findings:</b></p>

<p>{{medical_findings}}</p>

</div>

<br>

Issuer Authority: {{issuer_authority}}<br>
Issue Date: {{issue_date}}

</body>
</html>`;

const invoiceTemplate = `<!DOCTYPE html>
<html>
<head>
<style>
body{
    font-family: Arial;
    padding:40px;
}
table{
    width:100%;
    border-collapse:collapse;
}
td,th{
    border:1px solid #ddd;
    padding:10px;
}
</style>
</head>
<body>

<h1>INVOICE</h1>

<table>
<tr>
<td>Invoice Number</td>
<td>{{invoice_number}}</td>
</tr>

<tr>
<td>Payer/Payee</td>
<td>{{payer_name}}</td>
</tr>

<tr>
<td>GSTIN</td>
<td>{{gstin}}</td>
</tr>

<tr>
<td>Amount</td>
<td>₹{{amount}}</td>
</tr>

<tr>
<td>Due Date</td>
<td>{{due_date}}</td>
</tr>
</table>

<br><br>

Issuer Authority: {{issuer_authority}}<br>
Issue Date: {{issue_date}}

</body>
</html>`;

const legalTemplate = `<!DOCTYPE html>
<html>
<head>
<style>
body{
    font-family: "Times New Roman";
    padding:50px;
}
</style>
</head>
<body>

<h1 style="text-align:center;">
{{document_type}}
</h1>

<p>
This legal document is executed between
<b>{{party_names}}</b>.
</p>

<p>
The agreement becomes effective on
<b>{{execution_date}}</b>.
</p>

<p>
Certified by:
<b>{{advocate_name}}</b>
</p>

<br><br>

Issuer Authority: {{issuer_authority}}<br>
Issue Date: {{issue_date}}

</body>
</html>`;

const governmentIdTemplate = `<!DOCTYPE html>
<html>
<head>
<style>
.id-card{
    width:500px;
    border:3px solid black;
    padding:20px;
    font-family:Arial;
}
</style>
</head>
<body>

<div class="id-card">

<h3>{{document_type}}</h3>

<p><b>Name:</b> {{name}}</p>

<p><b>Issuing Authority:</b> {{issuing_authority}}</p>

<p><b>Valid Until:</b> {{validity_date}}</p>

<p><b>Document ID:</b> {{document_id}}</p>

</div>

<br>

Issuer Authority: {{issuer_authority}}<br>
Issue Date: {{issue_date}}

</body>
</html>`;

const templates = {
  Certificate: certificateTemplate,
  Marksheet: certificateTemplate,
  Degree: certificateTemplate,
  Bonafide: certificateTemplate,

  "Offer Letter": offerLetterTemplate,
  "Experience Letter": experienceLetterTemplate,

  "Medical Report": medicalTemplate,

  Invoice: invoiceTemplate,

  "Legal Document": legalTemplate,

  "Identity Document": governmentIdTemplate
};

function getTemplate(documentType) {
  return templates[documentType] || certificateTemplate;
}

module.exports = {
  getTemplate
};
