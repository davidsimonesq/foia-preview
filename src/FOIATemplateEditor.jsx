import { useState, useEffect } from "react";
import agencyData from "./foia-sample-data.json";

const DEFAULT_TEMPLATE_TEXT = `{{today_date}}

{{agency_name}}
{{#if agency_foia_officer}}{{agency_foia_officer}}{{/if}}
{{#if agency_address}}{{agency_address_line1}}
{{#if agency_address_line2}}{{agency_address_line2}}{{/if}}
{{agency_city}}, {{agency_state}} {{agency_postal_code}}{{/if}}

Re: Freedom of Information Act Request

Dear FOIA Officer:

Pursuant to the federal Freedom of Information Act, 5 U.S.C. § 552, I request access to and copies of the following records:

{{description}}

{{#if preferred_format}}I would prefer to receive these records in {{preferred_format}} format if available.{{/if}}

I am making this request as {{#if fee_category}}{{fee_category}}{{else}}a representative of the news media, as defined under 5 U.S.C. § 552(a)(4)(A)(ii)(II). The information requested will be used to inform the public through publication on ungovr.org. As such, only duplication fees should apply{{/if}}.

{{#if fee_waiver_justification}}I request a waiver of all fees for this request. {{fee_waiver_justification}} Disclosure of the requested information to me is in the public interest because it is likely to contribute significantly to public understanding of the operations or activities of the government and is not primarily in my commercial interest. I intend to make the results of this request publicly available through ungovr.org.{{/if}}

{{#if fee_cap}}If my fee waiver request is denied and fees would exceed {{fee_cap}}, please notify me before proceeding.{{/if}}

If you deny all or any part of this request, please cite the specific FOIA exemption(s) you believe justifies your refusal to release the information. Please provide all segregable portions of otherwise exempt records. I reserve the right to appeal your decision to deny any portion of my request.

I am willing to accept records on a rolling basis as they are processed. I am happy to discuss the scope of this request to expedite processing.

Please send all responsive records and correspondence to:

{{ungovr_email}}

Thank you for your assistance.

Sincerely,

{{#if requester_name}}{{requester_name}}
{{#if requester_address_line1}}{{requester_address_line1}}
{{#if requester_address_line2}}{{requester_address_line2}}{{/if}}
{{requester_city}}, {{requester_state}} {{requester_postal_code}}{{/if}}
{{#if requester_phone}}{{requester_phone}}{{/if}}
{{else}}A member of the public{{/if}}
Email: {{ungovr_email}}`;

const DEFAULT_NOTES = "Standard FOIA request template for U.S. federal agencies. Generates a complete request with agency-specific addressing, records description with component-level scoping, news media fee category declaration, fee waiver justification, and rolling production language. Supports 19 agencies across DHS, HHS, and standalone departments.";
const METADATA = { type: "standard", language: "en", variables: "4 core, 6 conditional" };
const RESOURCE_LINKS = [
  { label: "RCFP FOIA Letter Generator", href: "https://www.rcfp.org/foia-letter-generator/" },
  { label: "FOIA.gov Request Portal", href: "https://www.foia.gov/request/agency-search.html" },
  { label: "National Security Archive FOIA Guide", href: "https://nsarchive.gwu.edu/foia" },
  { label: "MuckRock Federal Agency Guide", href: "https://www.muckrock.com/agency/" },
  { label: "Standard FOIA Request", href: "#" },
];
const HINT_VARIABLES = ["{{today_date}}", "{{agency_name}}", "{{description}}", "{{ungovr_email}}"];

// Flatten agency + request_defaults into a single template context
function buildContext(agencyEntry) {
  const ctx = {
    ...agencyData.request_defaults,
    ...agencyEntry.agency,
    today_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  };
  if (agencyEntry.description_scope) {
    ctx.description = ctx.description.replace("{{description_scope}}", agencyEntry.description_scope);
  }
  return ctx;
}

function renderTemplate(template, data) {
  let result = template;
  let prev;

  // Iteratively process innermost {{#if}} blocks (no nested {{#if}} inside)
  // until all layers of nesting are resolved
  do {
    prev = result;
    // {{#if}}...{{else}}...{{/if}} — innermost only (no nested {{#if}} or {{/if}} in either branch)
    result = result.replace(
      /\{\{#if (\w+)\}\}((?:(?!\{\{(?:#if |\/if\}\}))[\s\S])*?)\{\{else\}\}((?:(?!\{\{(?:#if |\/if\}\}))[\s\S])*?)\{\{\/if\}\}/g,
      (_, key, ifBlock, elseBlock) => (data[key] ? ifBlock : elseBlock)
    );
    // {{#if}}...{{/if}} without else — innermost only
    result = result.replace(
      /\{\{#if (\w+)\}\}((?:(?!\{\{#if )[\s\S])*?)\{\{\/if\}\}(\n?)/g,
      (_, key, block, nl) => (data[key] ? block + nl : "")
    );
  } while (result !== prev);

  // Clean up empty lines left by resolved conditionals
  result = result.replace(/\n{3,}/g, "\n\n");
  // Replace variables
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || "");
  // Remove lines that are empty or only whitespace/punctuation after substitution
  result = result.replace(/^[ \t]*[,.:]*[ \t]*$/gm, "");
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}

function toParagraphs(text) {
  return text.split("\n\n")
    .map(block => block.split("\n").filter(line => line.trim()))
    .filter(lines => lines.length > 0);
}

const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const mono = "'Monaco', 'Courier New', monospace";
const brand = "#265d9d";

const color = {
  blue: brand, blueLight: "#eff6ff", blueBorder: "#93c5fd",
  green: "#16a34a", gray50: "#f9fafb", gray200: "#e5e7eb",
  gray300: "#d1d5db", gray400: "#9ca3af", gray500: "#6b7280",
  gray700: "#374151", gray900: "#111827",
};

const s = {
  page: { fontFamily: sans, maxWidth: 860, margin: "0 auto", padding: "28px 24px 48px", backgroundColor: "#fff", color: color.gray700 },
  row: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 24, fontWeight: 700, color: brand, margin: 0, lineHeight: 1.2 },
  subtitle: { fontSize: 13, color: color.gray500, margin: "4px 0 0" },
  saveBtn: (saved) => ({ backgroundColor: saved ? color.green : brand, color: "#fff", border: "none", borderRadius: 6, padding: "9px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: sans, transition: "background-color 0.2s" }),
  divider: { border: "none", borderTop: `1px solid ${color.gray200}`, margin: "16px 0" },
  linksBox: { border: `1px solid ${color.gray200}`, borderRadius: 8, padding: "14px 16px", marginBottom: 14 },
  linkRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 0", marginBottom: 6 },
  navLink: { color: brand, fontSize: 14, textDecoration: "none", fontWeight: 500, marginRight: 16 },
  pipe: { color: color.gray300, marginRight: 16, fontSize: 14 },
  resourceLink: { color: color.gray700, fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, marginRight: 20, marginBottom: 6 },
  greenDot: { color: "#16a34a", fontSize: 10 },
  metaBox: { border: `1px solid ${color.gray200}`, borderRadius: 8, padding: "12px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between" },
  metaLabel: { fontSize: 12, color: color.gray400, marginBottom: 3 },
  metaValue: { fontSize: 14, color: color.gray700 },
  tabBar: { display: "flex", gap: 28, borderBottom: `1px solid ${color.gray200}`, marginBottom: 24 },
  tab: (active) => ({ background: "none", border: "none", borderBottom: active ? `2px solid ${brand}` : "2px solid transparent", marginBottom: -1, padding: "8px 0", cursor: "pointer", fontSize: 15, fontWeight: active ? 600 : 400, color: active ? brand : color.gray500, fontFamily: sans, outline: "none" }),
  fieldGroup: { marginBottom: 22 },
  fieldLabel: { display: "block", color: brand, fontWeight: 600, marginBottom: 8, fontSize: 15 },
  input: { width: "100%", padding: "10px 12px", border: `1px solid ${color.gray300}`, borderRadius: 6, fontSize: 14, color: color.gray700, boxSizing: "border-box", outline: "none", fontFamily: sans },
  textarea: { width: "100%", padding: "10px 12px", border: `1px solid ${color.gray300}`, borderRadius: 6, fontSize: "0.875rem", fontFamily: mono, color: color.gray700, boxSizing: "border-box", resize: "vertical", outline: "none", lineHeight: 1.6 },
  hint: { borderLeft: `4px solid ${color.blueBorder}`, backgroundColor: color.blueLight, padding: "10px 14px", marginBottom: 24, borderRadius: "0 6px 6px 0", fontSize: 13, color: color.gray700, lineHeight: 1.5 },
  hintVar: { color: brand, fontWeight: 500, fontFamily: mono },

  // Preview
  previewHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  previewHeading: { fontSize: 18, fontWeight: 700, color: color.gray900, margin: 0 },
  agencyPickerWrap: { display: "flex", alignItems: "center", gap: 10 },
  agencyPickerLabel: { fontSize: 13, color: color.gray500, whiteSpace: "nowrap" },
  agencyPicker: { padding: "6px 10px", border: `1px solid ${color.gray300}`, borderRadius: 6, fontSize: 13, color: color.gray700, fontFamily: sans, outline: "none", cursor: "pointer", backgroundColor: "#fff" },
  agencyNav: { display: "flex", alignItems: "center", gap: 6 },
  navBtn: { background: "none", border: `1px solid ${color.gray300}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 16, color: color.gray600, lineHeight: 1, fontFamily: sans },
  agencyCount: { fontSize: 12, color: color.gray400, minWidth: 40, textAlign: "center" },
  previewBox: { border: `1px solid ${color.gray200}`, borderRadius: 6, padding: "32px 36px", fontFamily: sans, fontSize: 14, color: color.gray700, backgroundColor: "#fff", maxHeight: 560, overflowY: "auto" },
  previewPara: { margin: "0 0 14px 0", lineHeight: 1.4 },
  previewLine: { display: "block" },
  submissionBox: { marginTop: 20, border: `1px solid ${color.gray200}`, borderRadius: 6, padding: "14px 18px", backgroundColor: color.gray50, fontSize: 13, color: color.gray700 },
  submissionTitle: { fontWeight: 600, marginBottom: 8, color: color.gray900 },
  submissionRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 },
};

export default function FOIATemplateEditor() {
  const [activeTab, setActiveTab] = useState("edit");
  const [templateName, setTemplateName] = useState("Standard FOIA Request");
  const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATE_TEXT);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [agencyIndex, setAgencyIndex] = useState(0);
  const [previewText, setPreviewText] = useState("");

  const agencies = agencyData.agencies;
  const selectedAgency = agencies[agencyIndex];
  const context = buildContext(selectedAgency);
  const renderedText = renderTemplate(templateText, context);
  const paragraphs = toParagraphs(renderedText);

  // Regenerate preview text when agency or template changes
  useEffect(() => {
    setPreviewText(renderedText);
  }, [renderedText]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.row}>
        <div>
          <h1 style={s.title}>Freedom of Information Act</h1>
          <p style={s.subtitle}>us/federal</p>
        </div>
        {activeTab === "preview" ? (
          <button style={s.saveBtn(copied)} onClick={handleCopy}>
            {copied ? "✓ Copied" : "Copy to Clipboard"}
          </button>
        ) : (
          <button style={s.saveBtn(saved)} onClick={handleSave}>
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
        )}
      </div>

      <hr style={s.divider} />

      {/* Links */}
      <div style={s.linksBox}>
        <div style={s.linkRow}>
          <a href="#" style={s.navLink}>Public law page</a>
          <a href="#" style={s.navLink}>Request intro page</a>
          <span style={s.pipe}>|</span>
          {RESOURCE_LINKS.slice(0, 2).map((r) => (
            <a key={r.label} href={r.href} target="_blank" rel="noreferrer" style={s.resourceLink}>
              <span style={s.greenDot}>●</span>{r.label}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {RESOURCE_LINKS.slice(2).map((r) => (
            <a key={r.label} href={r.href} target="_blank" rel="noreferrer" style={s.resourceLink}>
              <span style={s.greenDot}>●</span>{r.label}
            </a>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div style={s.metaBox}>
        {[["Type", METADATA.type], ["Language", METADATA.language], ["Variables", METADATA.variables]].map(([label, value]) => (
          <div key={label}>
            <div style={s.metaLabel}>{label}</div>
            <div style={s.metaValue}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {["edit", "preview"].map((tab) => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Edit tab */}
      {activeTab === "edit" && (
        <>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Template Name</label>
            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={s.input} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Template Text</label>
            <textarea value={templateText} onChange={(e) => setTemplateText(e.target.value)} rows={18} style={s.textarea} />
          </div>
          <div style={s.hint}>
            Use variables like{" "}
            {HINT_VARIABLES.map((v, i, arr) => (
              <span key={v}><span style={s.hintVar}>{v}</span>{i < arr.length - 1 ? ", " : "."}</span>
            ))}
          </div>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={s.textarea} />
          </div>
        </>
      )}

      {/* Preview tab */}
      {activeTab === "preview" && (
        <>
          <div style={s.previewHeader}>
            <div style={s.previewHeading}>Request Preview</div>
            <div style={s.agencyPickerWrap}>
              <span style={s.agencyPickerLabel}>Agency:</span>
              <select
                style={s.agencyPicker}
                value={agencyIndex}
                onChange={(e) => setAgencyIndex(Number(e.target.value))}
              >
                {agencies.map((a, i) => {
                  // Skip children — they're rendered inside their parent's optgroup
                  if (a.parent_id) return null;
                  const children = agencies
                    .map((c, ci) => ({ entry: c, index: ci }))
                    .filter((c) => c.entry.parent_id === a._id);
                  if (children.length === 0) {
                    return <option key={a._id} value={i}>{a.agency.agency_name}</option>;
                  }
                  return (
                    <optgroup key={a._id} label={a.agency.agency_name}>
                      <option value={i}>{a.agency.agency_name} (Headquarters)</option>
                      {children.map((c) => (
                        <option key={c.entry._id} value={c.index}>{c.entry.agency.agency_name}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Editable rendered letter */}
          <textarea
            style={{ ...s.previewBox, fontFamily: sans, fontSize: 14, lineHeight: 1.6, minHeight: 480, resize: "vertical", whiteSpace: "pre-wrap" }}
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
          />

          {/* Submission details for selected agency */}
          <div style={s.submissionBox}>
            <div style={s.submissionTitle}>Submission Details — {selectedAgency.agency.agency_name}</div>
            {selectedAgency.submission.portal_url && (
              <div style={s.submissionRow}>
                <span>🔗</span>
                <a href={selectedAgency.submission.portal_url} target="_blank" rel="noreferrer" style={{ color: brand }}>
                  FOIA Portal
                </a>
              </div>
            )}
            {selectedAgency.submission.email && (
              <div style={s.submissionRow}>
                <span>📧</span>
                <span style={{ fontFamily: mono }}>{selectedAgency.submission.email}</span>
              </div>
            )}
            {selectedAgency.submission.guidelines && (
              <div style={s.submissionRow}>
                <span>📝</span>
                <span style={{ color: color.gray500 }}>{selectedAgency.submission.guidelines}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
