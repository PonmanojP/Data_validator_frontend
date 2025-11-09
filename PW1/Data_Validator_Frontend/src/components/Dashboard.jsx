import React, { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "./css/Dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [username, setUsername] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [report, setReport] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationId, setValidationId] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/user/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUsername(data.username))
      .catch(() => setUsername(""));
  }, []);

  const handleFileChange = (e) => {
    const chosen = e.target.files[0];
    setFile(chosen);
    setStatus("");
    setReport(null);
    setLogs(null);
    setValidationId(null);
  };

  const handleUpload = async () => {
    if (!file) return setStatus("Select a file first.");

    setStatus("");
    setLoading(true);
    setReport(null);
    setLogs(null);

    const form = new FormData();
    form.append("file", file);
    form.append("config", JSON.stringify({ use_defaults: true }));

    try {
      const res = await fetch("http://localhost:8000/validate/upload/", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json().catch(() => null);
      console.log("Response data:", data);

      if (!res.ok) {
        const msg =
          (data && (data.error || JSON.stringify(data))) ||
          `Upload failed (status ${res.status})`;
        setStatus(msg);
        setLoading(false);
        return;
      }

      if (data && data.report) {
        setReport(data.report);
        if (data.validation_id) {
          setValidationId(data.validation_id);
        }
        setStatus("Validation completed. Full logs received.");
      } else {
        setStatus("Validation completed, but no report found in response.");
      }

      if (data && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      setStatus("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const timeGreeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  const downloadReportPDF = async () => {
    if (!report) return;

    try {
      // Get the report element
      const element = reportRef.current;
      if (!element) return;

      // Hide download buttons before capturing
      const downloadButtons = element.querySelector('.download-buttons-container');
      const originalDisplay = downloadButtons ? downloadButtons.style.display : '';
      if (downloadButtons) {
        downloadButtons.style.display = 'none';
      }

      // Get all sections (card-panel elements)
      const sections = element.querySelectorAll('.card-panel, .print-header');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // Top/bottom margin in mm
      let currentY = margin; // Current Y position on page

      // Process header first
      const header = element.querySelector('.print-header');
      if (header) {
        const headerCanvas = await html2canvas(header, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const headerHeight = (headerCanvas.height * imgWidth) / headerCanvas.width;
        
        // Check if header fits on current page
        if (currentY + headerHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', 0, currentY, imgWidth, headerHeight);
        currentY += headerHeight + 5; // Add small spacing
      }

      // Process each section individually
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Skip header (already processed) and download buttons
        if (section.classList.contains('print-header') || section.querySelector('.download-buttons-container')) {
          continue;
        }

        // Capture this section
        const sectionCanvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const sectionHeight = (sectionCanvas.height * imgWidth) / sectionCanvas.width;
        const sectionHeightWithMargin = sectionHeight + 10; // Add margin for spacing

        // Check if section fits on current page
        if (currentY + sectionHeightWithMargin > pageHeight - margin) {
          // Section doesn't fit, start new page
          pdf.addPage();
          currentY = margin;
        }

        // Add section to PDF
        pdf.addImage(sectionCanvas.toDataURL('image/png'), 'PNG', 0, currentY, imgWidth, sectionHeight);
        currentY += sectionHeight + 10; // Move Y position and add spacing
      }

      // Restore download buttons
      if (downloadButtons) {
        downloadButtons.style.display = originalDisplay || '';
      }

      // Generate filename
      const datasetName = report.dataset_name || 'dataset';
      const baseName = datasetName.replace(/\.[^/.]+$/, '');
      const filename = `${baseName}_validation_report.pdf`;

      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setStatus('Error generating PDF report. Please try again.');
    }
  };

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1 className="greet">{timeGreeting} {username || "Guest"}</h1>
          <br />
          <br />
          <p className="greet-sub">Upload a CSV to analyze privacy and utility.</p>
        </header>

        <div className="upload-container card-panel">
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />

          <button
            className="primary-btn"
            onClick={handleUpload}
            style={{ marginTop: 12 }}
            disabled={loading}
          >
            {loading ? "Uploading & Processing..." : "Upload & Run Validation"}
          </button>

          {status && <div style={{ marginTop: 12 }}>{status}</div>}
        </div>

        {/* Final report */}
        {report && (
          <div ref={reportRef} className="report-content">
            {/* Printable header with logo - visible for PDF generation */}
            <div className="print-header">
              <img src="/logo.png" alt="Logo" className="report-logo" onError={(e) => { e.target.style.display = 'none'; }} />
              <h1 className="report-main-title">Privacy Risk Analysis and Mitigation Summary (PRAMS)</h1>
            </div>
            
            <>
            {/* Dataset Information */}
            {(report.dataset_name || report.dataset_rows || report.dataset_columns) && (
              <section className="report-panel card-panel" style={{ marginTop: 18 }}>
                <h2 className="report-section-title">Dataset Information</h2>
                <table className="report-table">
                  <tbody>
                    {report.dataset_name && (
                      <tr>
                        <td className="table-label">Dataset Name</td>
                        <td className="table-value">{report.dataset_name}</td>
                      </tr>
                    )}
                    {report.dataset_rows !== undefined && (
                      <tr>
                        <td className="table-label">Number of Rows</td>
                        <td className="table-value">{report.dataset_rows.toLocaleString()}</td>
                      </tr>
                    )}
                    {report.dataset_columns !== undefined && (
                      <tr>
                        <td className="table-label">Number of Columns</td>
                        <td className="table-value">{report.dataset_columns}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            )}

            {/* Summary Metrics */}
            <section className="report-panel card-panel" style={{ marginTop: 18 }}>
              <h2 className="report-section-title">Privacy & Utility Summary</h2>
              {(() => {
                // Get initial PES from progression (iteration 0) or before_pes
                const initialPes = report.pes_progression && report.pes_progression.length > 0
                  ? report.pes_progression.find(p => p.iteration === 0)
                  : null;
                const initialPesValue = initialPes 
                  ? initialPes.pes 
                  : (report.before_pes?.PES !== undefined 
                      ? report.before_pes.PES 
                      : report.before_pes?.score);
                const initialRiskLevel = initialPes?.risk_level || report.before_pes?.risk_level;

                // Get best/final PES from progression (lowest PES value, excluding iteration 0)
                const iterations = report.pes_progression && report.pes_progression.length > 0
                  ? report.pes_progression.filter(p => p.iteration > 0)
                  : [];
                const bestPes = iterations.length > 0 
                  ? iterations.reduce((best, current) => current.pes < best.pes ? current : best, iterations[0])
                  : null;
                const finalPesValue = bestPes?.pes;
                const finalRiskLevel = bestPes?.risk_level;

                return (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Before</th>
                        <th>After</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="table-label">Privacy Exposure Score (PES)</td>
                        <td className="table-value">
                          {initialPesValue !== undefined ? initialPesValue.toFixed(4) : 'N/A'}
                        </td>
                        <td className="table-value">
                          {finalPesValue !== undefined ? finalPesValue.toFixed(4) : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="table-label">Risk Level</td>
                        <td className="table-value">
                          <span className={`risk-badge ${(initialRiskLevel || 'unknown').toLowerCase()}`}>
                            {initialRiskLevel || 'Unknown'}
                          </span>
                        </td>
                        <td className="table-value">
                          <span className={`risk-badge ${(finalRiskLevel || 'unknown').toLowerCase()}`}>
                            {finalRiskLevel || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="table-label">Utility Score</td>
                        <td className="table-value">
                          {report.initial_utility !== undefined ? report.initial_utility.toFixed(4) : 'N/A'}
                        </td>
                        <td className="table-value">
                          {report.final_utility !== undefined ? report.final_utility.toFixed(4) : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })()}
            </section>

            {/* PES Progression */}
            {report.pes_progression && report.pes_progression.length > 0 && (
              <section className="report-panel card-panel" style={{ marginTop: 18 }}>
                <h2 className="report-section-title">PES Progression Across Iterations</h2>
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Iteration</th>
                        <th>PES Value</th>
                        <th>Risk Level</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Find the best iteration (lowest PES, excluding iteration 0)
                        const iterations = report.pes_progression.filter(p => p.iteration > 0);
                        const bestPes = iterations.length > 0 
                          ? Math.min(...iterations.map(p => p.pes))
                          : null;
                        const bestIteration = bestPes !== null
                          ? report.pes_progression.findIndex(p => p.iteration > 0 && p.pes === bestPes)
                          : -1;
                        
                        return report.pes_progression.map((prog, idx) => {
                          const isBest = idx === bestIteration && bestIteration > 0;
                          return (
                            <tr key={idx} className={isBest ? 'best-iteration' : ''}>
                              <td className="table-value">{prog.iteration}</td>
                              <td className="table-value">{prog.pes.toFixed(4)}</td>
                              <td className="table-value">
                                <span className={`risk-badge ${(prog.risk_level || 'unknown').toLowerCase()}`}>
                                  {prog.risk_level || 'Unknown'}
                                </span>
                              </td>
                              <td className="table-value">
                                {prog.iteration === 0 ? (
                                  <span className="status-badge initial">Initial</span>
                                ) : isBest ? (
                                  <span className="status-badge best">Best Result</span>
                                ) : (
                                  <span className="status-badge iteration">Iteration {prog.iteration}</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Utility Progression */}
            {report.utility_progression && report.utility_progression.length > 0 && (
              <section className="report-panel card-panel" style={{ marginTop: 18 }}>
                <h2 className="report-section-title">Utility Progression Across Iterations</h2>
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Iteration</th>
                        <th>Utility Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Find the best iteration (lowest PES, excluding iteration 0) to match PES progression
                        const pesIterations = report.pes_progression ? report.pes_progression.filter(p => p.iteration > 0) : [];
                        const bestPes = pesIterations.length > 0 
                          ? Math.min(...pesIterations.map(p => p.pes))
                          : null;
                        const bestIterationIdx = bestPes !== null && report.pes_progression
                          ? report.pes_progression.findIndex(p => p.iteration > 0 && p.pes === bestPes)
                          : -1;
                        // Find corresponding utility iteration
                        const bestUtilityIteration = bestIterationIdx >= 0 && report.pes_progression
                          ? report.pes_progression[bestIterationIdx]?.iteration
                          : null;
                        
                        return report.utility_progression.map((util, idx) => {
                          const isBest = bestUtilityIteration !== null && util.iteration === bestUtilityIteration;
                          return (
                            <tr key={idx} className={isBest ? 'best-iteration' : ''}>
                              <td className="table-value">{util.iteration}</td>
                              <td className="table-value">{util.utility.toFixed(4)}</td>
                              <td className="table-value">
                                {util.iteration === 0 ? (
                                  <span className="status-badge initial">Initial</span>
                                ) : isBest ? (
                                  <span className="status-badge best">Best Result</span>
                                ) : (
                                  <span className="status-badge iteration">Iteration {util.iteration}</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* PES and Utility Progression Charts */}
            {report.pes_progression && report.pes_progression.length > 0 && report.utility_progression && report.utility_progression.length > 0 && (
              <section className="report-panel card-panel" style={{ marginTop: 18 }}>
                <h2 className="report-section-title">Progression Visualization</h2>
                <div className="charts-container">
                  {/* PES Progression Chart */}
                  <div className="chart-wrapper">
                    <h3 className="chart-title">PES Progression</h3>
                    <Line
                      data={{
                        labels: report.pes_progression.map(p => `Iteration ${p.iteration}`),
                        datasets: [
                          {
                            label: 'PES Value',
                            data: report.pes_progression.map(p => p.pes),
                            borderColor: '#c62828',
                            backgroundColor: 'rgba(198, 40, 40, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#c62828',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              color: '#333',
                              font: {
                                family: 'Poppins, sans-serif',
                                size: 12,
                                weight: '600'
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                              family: 'Poppins, sans-serif',
                              size: 13,
                              weight: '600'
                            },
                            bodyFont: {
                              family: 'Poppins, sans-serif',
                              size: 12
                            },
                            callbacks: {
                              label: function(context) {
                                return `PES: ${context.parsed.y.toFixed(4)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: false,
                            ticks: {
                              color: '#4a4a4a',
                              font: {
                                family: 'Poppins, sans-serif',
                                size: 11
                              },
                              callback: function(value) {
                                return value.toFixed(3);
                              }
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            }
                          },
                          x: {
                            ticks: {
                              color: '#4a4a4a',
                              font: {
                                family: 'Poppins, sans-serif',
                                size: 11
                              }
                            },
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Utility Progression Chart */}
                  <div className="chart-wrapper">
                    <h3 className="chart-title">Utility Progression</h3>
                    <Line
                      data={{
                        labels: report.utility_progression.map(u => `Iteration ${u.iteration}`),
                        datasets: [
                          {
                            label: 'Utility Score',
                            data: report.utility_progression.map(u => u.utility),
                            borderColor: '#29543D',
                            backgroundColor: 'rgba(41, 84, 61, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#29543D',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              color: '#333',
                              font: {
                                family: 'Poppins, sans-serif',
                                size: 12,
                                weight: '600'
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                              family: 'Poppins, sans-serif',
                              size: 13,
                              weight: '600'
                            },
                            bodyFont: {
                              family: 'Poppins, sans-serif',
                              size: 12
                            },
                            callbacks: {
                              label: function(context) {
                                return `Utility: ${context.parsed.y.toFixed(4)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 1.0,
                            ticks: {
                              color: '#4a4a4a',
                              font: {
                                family: 'Poppins, sans-serif',
                                size: 11
                              },
                              callback: function(value) {
                                return value.toFixed(3);
                              }
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            }
                          },
                          x: {
                            ticks: {
                              color: '#4a4a4a',
                              font: {
                                family: 'Poppins, sans-serif',
                                size: 11
                              }
                            },
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Techniques Applied */}
            {report.techniques_applied && report.techniques_applied.length > 0 && (
              <section className="report-panel card-panel" style={{ marginTop: 18 }}>
                <h2 className="report-section-title">Privacy Techniques Applied</h2>
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Technique</th>
                        <th>Parameters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.techniques_applied.map((tech, idx) => (
                        <tr key={idx}>
                          <td className="table-value technique-name">{tech}</td>
                          <td className="table-value">
                            {report.technique_config && report.technique_config[idx] ? (
                              <div className="params-display">
                                {Object.entries(report.technique_config[idx]).map(([key, value]) => (
                                  <span key={key} className="param-tag">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                                {Object.keys(report.technique_config[idx]).length === 0 && (
                                  <span className="param-tag empty">No parameters</span>
                                )}
                              </div>
                            ) : (
                              <span className="param-tag empty">No parameters</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Column Enforcement */}
            {report.column_enforcement && Object.keys(report.column_enforcement).length > 0 && (
              <section className="report-panel card-panel" style={{ marginTop: 18 }}>
                <h2 className="report-section-title">Column-Level Enforcement Methods</h2>
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Column Name</th>
                        <th>Techniques Applied</th>
                        <th>Parameters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(report.column_enforcement).map(([column, enforcements]) => {
                        // Check if differential_privacy and permutation are present
                        const hasDifferentialPrivacy = enforcements.some(e => e.technique === 'differential_privacy');
                        const hasPermutation = enforcements.some(e => e.technique === 'permutation');
                        const shouldFilter = hasDifferentialPrivacy && hasPermutation;
                        
                        // Filter out k_anonymity and suppression if both differential_privacy and permutation are present
                        const filteredEnforcements = shouldFilter
                          ? enforcements.filter(e => 
                              e.technique !== 'k_anonymity' && e.technique !== 'suppression'
                            )
                          : enforcements;
                        
                        // Skip this row if no enforcements remain after filtering
                        if (filteredEnforcements.length === 0) {
                          return null;
                        }
                        
                        return (
                          <tr key={column}>
                            <td className="table-value column-name">{column}</td>
                            <td className="table-value">
                              <div className="techniques-list">
                                {filteredEnforcements.map((enf, idx) => (
                                  <span key={idx} className="technique-tag">
                                    {enf.technique}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="table-value">
                              <div className="params-display">
                                {filteredEnforcements.map((enf, idx) => (
                                  <div key={idx} className="param-group">
                                    {Object.keys(enf.params || {}).length > 0 ? (
                                      Object.entries(enf.params).map(([key, value]) => (
                                        <span key={key} className="param-tag small">
                                          {key}: {String(value)}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="param-tag small empty">No params</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Download Buttons */}
            {report && validationId && (
              <section className="report-panel card-panel" style={{ marginTop: 18 }}>
                <h2 className="report-section-title">Download Results</h2>
                <div className="download-buttons-container">
                  <button
                    className="download-btn dataset-btn"
                    onClick={() => {
                      window.location.href = `http://localhost:8000/validate/download-dataset/${validationId}/`;
                    }}
                  >
                    <span className="download-icon">📥</span>
                    Download Transformed Dataset
                  </button>
                  <button
                    className="download-btn report-btn"
                    onClick={downloadReportPDF}
                  >
                    <span className="download-icon">📄</span>
                    Download Validation Report (PDF)
                  </button>
            </div>
          </section>
            )}
            </>
          </div>
        )}

        {/* Full logs viewer */}
        {logs && (
          <section className="report-panel card-panel" style={{ marginTop: 18 }}>
            <h2>Full Framework Logs</h2>
            <div style={{ marginTop: 8, maxHeight: "50vh", overflow: "auto" }}>
              {Object.entries(logs).map(([name, content]) => (
                <div key={name} style={{ marginBottom: 12 }}>
                  <strong>{name}</strong>
                  <div style={{ marginTop: 6, background: "#f8f8f8", padding: 8 }}>
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                      {typeof content === "object" ? JSON.stringify(content, null, 2) : String(content)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
