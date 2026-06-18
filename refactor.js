const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let content = fs.readFileSync(appPath, 'utf-8');

// 1. Remove mockDocuments import
content = content.replace(/import \{ mockDocuments \} from '\.\/data\/mockDocuments';\n/, '');

// 2. Replace the entire VerifyPage function
const verifyPageReplacement = `function VerifyPage() {
  const { documentId: routeDocumentId } = useParams();
  const [inputDocId, setInputDocId] = useState(routeDocumentId || '');
  const [checkedDocId, setCheckedDocId] = useState(routeDocumentId || '');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [backendRecord, setBackendRecord] = useState(null);
  const [outcome, setOutcome] = useState('none');

  React.useEffect(() => {
    if (!checkedDocId) {
      setBackendRecord(null);
      setOutcome('none');
      return;
    }

    let active = true;
    const fetchDoc = async () => {
      setIsVerifying(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        if (uploadedFile) {
           const formData = new FormData();
           formData.append('documentId', checkedDocId);
           formData.append('file', uploadedFile);
           const res = await fetch(\`\${apiUrl}/api/verify/upload\`, {
             method: 'POST',
             body: formData
           });
           const json = await res.json();
           if (!active) return;
           if (json.success) {
              setBackendRecord(json.data);
              setOutcome(json.data.status === 'Revoked' ? 'revoked' : 'valid');
           } else {
              if (json.status === 'INVALID') {
                 setOutcome('flagged');
              } else {
                 setOutcome('missing');
              }
           }
        } else {
           const res = await fetch(\`\${apiUrl}/api/verify/\${checkedDocId}\`);
           const json = await res.json();
           if (!active) return;
           if (json.success) {
              setBackendRecord(json.data);
              setOutcome(json.data.status === 'Revoked' ? 'revoked' : 'valid');
           } else {
              setBackendRecord(null);
              setOutcome('missing');
           }
        }
      } catch (err) {
        console.warn('Backend server error:', err);
        if (active) {
           setBackendRecord(null);
           setOutcome('missing');
        }
      } finally {
        if (active) setIsVerifying(false);
      }
    };
    
    // Slight delay for UX
    const timer = setTimeout(() => fetchDoc(), 800);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [checkedDocId, uploadedFile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputDocId) return;
    setCheckedDocId(inputDocId);
  };

  const fileName = uploadedFile?.name || '';
  const verificationTimestamp = new Date().toLocaleString();
  
  const mergedView = backendRecord ? {
    ...backendRecord,
    userName: backendRecord.recipientName || 'Unknown',
    verificationTimestamp
  } : {};

  return (
    <AppLayout>
      <div className="dashboard-split">
        <div className="panel-card">
          <div>
            <h1>Verify a secure document</h1>
            <p className="subtitle">Authenticity verification and cryptographic audit logging console.</p>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="full-span">
                <span style={{ display: "flex", alignItems: "center" }}>
                  Document ID
                  <Tooltip text="The unique registration identifier of the document to pull registry details from the secure ledger." />
                </span>
                <input value={inputDocId} required onChange={(event) => setInputDocId(event.target.value)} placeholder="e.g. A1B2C3" />
              </label>
              <label className="full-span">
                <span style={{ display: "flex", alignItems: "center" }}>
                  Compare Document PDF file
                  <Tooltip text="Upload a PDF file to run a cryptographic audit comparing its binary signature with the registered stamp." />
                </span>
                <CustomDropzone file={uploadedFile} setFile={setUploadedFile} />
              </label>
              
              <button
                type="submit"
                className="btn-primary full-span"
                style={{ marginTop: "0.5rem" }}
                disabled={isVerifying}
              >
                {isVerifying ? '🔍 Verifying...' : '🔍 Verify Document'}
              </button>
            </div>
          </form>
        </div>

        <div className="preview-container">
          <div className="hud-title">Verification Outcome HUD</div>
          <VerificationState 
             outcome={checkedDocId ? outcome : 'none'} 
             documentId={checkedDocId} 
             record={mergedView} 
             uploadedFile={fileName} 
             isVerifying={isVerifying} 
          />
        </div>
      </div>
    </AppLayout>
  );
}`;

const verifyPageStart = content.indexOf('function VerifyPage() {');
const homeRedirectStart = content.indexOf('function HomeRedirect() {');
content = content.substring(0, verifyPageStart) + verifyPageReplacement + '\n\n' + content.substring(homeRedirectStart);

fs.writeFileSync(appPath, content, 'utf-8');
console.log('App.jsx refactored successfully.');
