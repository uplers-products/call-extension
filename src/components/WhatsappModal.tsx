import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone, X } from 'lucide-react';
import type { TalentData } from '../types/common.types';
import { closeWhatsappModal } from '../store/callSlice';
import type { RootState } from '../store/store';
import toast from 'react-hot-toast';
import { getWhatsappTemplates } from '../services/userActions';
import RichEmailEditor from './common/RichEmailEditor';

interface WhatsappModalProps {
  isOpen: boolean;
  talent: TalentData | null;
}

type WhatsappTemplate = {
  template_id: number;
  name: string;
  content: string;
  is_default?: number;
  hr_required?: number;
};

type WhatsappDynamicField = {
  format: string;
  description?: string;
  placeholder?: string;
};

const formatIndianWhatsappNumber = (rawNumber?: string): string => {
  let formattedNumber = rawNumber ? rawNumber.trim() : '';
  formattedNumber = formattedNumber.replace(/\s/g, '');

  if (!formattedNumber) return '';

  if (!formattedNumber.startsWith('+91')) {
    formattedNumber = formattedNumber.replace(/^(\+?91|0+)/, '');
    formattedNumber = `+91${formattedNumber}`;
  }

  return formattedNumber;
};

const encodeMessage = (message: string): string => encodeURIComponent(message.trim());

/**
 * Removes all {{...}} placeholder fields from template content when setting from API.
 */
const removePlaceholderFields = (content: string): string => {
  if (!content) return content;
  return content.replace(/\{\{[^}]+\}\}/g, '');
};

const mapDynamicFields = (fields: Record<string, { description?: string; placeholder?: string }> | undefined): WhatsappDynamicField[] =>
  Object.entries(fields || {}).map(([key, value]) => ({
    format: `{{${key}}}`,
    description: value?.description,
    placeholder: value?.placeholder,
  }));

const formatWhatsappMessage = (html = ''): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const walk = (node: Node, formats: Array<'bold' | 'italic' | 'strike'> = []): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        const rawText = node.textContent ?? '';
        let text = rawText.replace(/\u00A0/g, ' ');
        if (!text.trim()) return text;

        const leadingSpaces = (text.match(/^\s*/)?.[0]) ?? '';
        const trailingSpaces = (text.match(/\s*$/)?.[0]) ?? '';
        const coreText = text.trim();

        let prefix = '';
        let suffix = '';

        if (formats.includes('bold')) {
          prefix += '*';
          suffix = `*${suffix}`;
        }
        if (formats.includes('italic')) {
          prefix += '_';
          suffix = `_${suffix}`;
        }
        if (formats.includes('strike')) {
          prefix += '~';
          suffix = `~${suffix}`;
        }

        return `${leadingSpaces}${prefix}${coreText}${suffix}${trailingSpaces}`;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'a') {
        const href = el.getAttribute('href') || el.textContent || '';
        return `\n${href}\n`;
      }

      const nextFormats = [...formats];
      if (tag === 'b' || tag === 'strong') nextFormats.push('bold');
      if (tag === 'i' || tag === 'em') nextFormats.push('italic');
      if (tag === 's' || tag === 'strike' || tag === 'del') nextFormats.push('strike');

      const content = Array.from(el.childNodes)
        .map((child) => walk(child, nextFormats))
        .join('');

      if (tag === 'br') return '\n';
      if (tag === 'div' || tag === 'p') return `\n${content}`;

      return content;
    };

    let result = walk(doc.body);
    result = result
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\*_+/g, '*_')
      .replace(/_+\*/g, '_*')
      .trim();

    return result;
  } catch {
    return html;
  }
};

const CALL_CONNECTED_TEMPLATE_ID = 39;
const CALL_NOT_CONNECTED_TEMPLATE_ID = 40;

const WhatsappModal: React.FC<WhatsappModalProps> = ({ isOpen, talent }) => {
  const dispatch = useDispatch();
  const wasCallEverConnected = useSelector((state: RootState) => state.call.wasCallEverConnected);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [dynamicFields, setDynamicFields] = useState<WhatsappDynamicField[]>([]);
  const [templateAppliedAt, setTemplateAppliedAt] = useState<number | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const hasSetDefaultTemplateRef = useRef(false);

  // PREVIEW STATES 
  // const [previewHtml, setPreviewHtml] = useState<string>('');
  // const [previewModalOpen, setPreviewModalOpen] = useState(false);
  // const [previewLoading, setPreviewLoading] = useState(false);

  // SAVE TEMPLATE STATES
  // const [saveLoading, setSaveLoading] = useState(false);


  const recipientName = talent?.name || '';
  const recipientNumber = useMemo(() => formatIndianWhatsappNumber(talent?.contact_number),
    [talent?.contact_number]
  );

  useEffect(() => {
    if (!isOpen) {
      hasSetDefaultTemplateRef.current = false;
      return;
    }

    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const res = await getWhatsappTemplates();
        const data = (res.data as any)?.data;

        const rawTemplates: WhatsappTemplate[] = Array.isArray(data?.templates) ? data.templates : [];
        const apiTemplates = rawTemplates.filter((t) => ![0, 1, 2].includes(t.template_id)); // exclude templates with id 0, 1 and 2
        setTemplates(apiTemplates);

        const fields = mapDynamicFields(data?.dynamic_talent_array);
        setDynamicFields(fields);
      } catch (e) {
        console.error(e);
        toast.error('Failed to fetch WhatsApp templates.');
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, [isOpen]);

  // Default to template 39 (call connected) or 40 (call not connected) when modal opens after a call
  useEffect(() => {
    if (!isOpen || templatesLoading || templates.length === 0 || hasSetDefaultTemplateRef.current) return;

    const defaultTemplateId = wasCallEverConnected ? CALL_CONNECTED_TEMPLATE_ID : CALL_NOT_CONNECTED_TEMPLATE_ID;
    const hasTemplate = templates.some((t) => t.template_id === defaultTemplateId);
    if (hasTemplate) {
      setSelectedTemplateId(defaultTemplateId);
      hasSetDefaultTemplateRef.current = true;
    }
  }, [isOpen, templates, templatesLoading, wasCallEverConnected]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.template_id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateName(selectedTemplate.name || '');
    const contentWithPlaceholdersRemoved = removePlaceholderFields(selectedTemplate.content || '');
    setTemplateContent(contentWithPlaceholdersRemoved);
    setTemplateAppliedAt(Date.now());

    // setPreviewHtml('');
    // setPreviewModalOpen(false);
  }, [selectedTemplate]);

  if (!isOpen) return null;

  const handleClose = () => {
    dispatch(closeWhatsappModal());

    // setPreviewHtml('');
    // setPreviewModalOpen(false);
  };

  // const buildPreviewPayload = (content: string) => {
  //   const convertedObject: Record<string, string> = {};
  //   dynamicFields.forEach((item) => {
  //     const fieldName = item.format.replace(/[{}]/g, '').toLowerCase();
  //     convertedObject[fieldName] = item.placeholder || '';
  //   });

  //   const payload: Record<string, unknown> = {
  //     // hr_id: hrDetails?.id,
  //     // talent_id: talent?.talent_id,
  //     default_text: JSON.stringify(convertedObject),
  //     content,
  //   };

  //   return payload;
  // };

  // const handlePreview = async (showModal = false): Promise<string | null> => {
  //   if (!templateContent.trim()) {
  //     toast.error('Please enter template content.');
  //     return null;
  //   }

  //   setPreviewLoading(true);
  //   setPreviewHtml('');

  //   try {
  //     const payload = buildPreviewPayload(templateContent);
  //     const res = await whatsappPreviewTemplate(payload);
  //     const html = (res.data as any)?.data;

  //     if (typeof html === 'string') {
  //       setPreviewHtml(html);
  //       if (showModal) setPreviewModalOpen(true);
  //       return html;
  //     }

  //     toast.error('Could not preview WhatsApp template.');
  //     return null;
  //   } catch (e) {
  //     console.error(e);
  //     toast.error('Could not preview WhatsApp template.');
  //     return null;
  //   } finally {
  //     setPreviewLoading(false);
  //   }
  // };

  // const handleSaveTemplate = async (isUpdate: boolean) => {
  //   if (!templateName.trim()) {
  //     toast.error('Please enter a template name.');
  //     return;
  //   }
  //   if (!templateContent.trim()) {
  //     toast.error('Please enter template content.');
  //     return;
  //   }

  //   const templateId = selectedTemplate?.template_id;
  //   if (isUpdate && !templateId) {
  //     toast.error('Please select a template to update.');
  //     return;
  //   }

  //   setSaveLoading(true);
  //   try {
  //     const payload: Record<string, unknown> = {
  //       // hr_id: hrDetails?.id,
  //       template_id: isUpdate ? templateId : 0,
  //       template_name: templateName,
  //       template_content: templateContent,
  //     };

  //     const res = await whatsappSaveTemplate(payload);
  //     if (res?.status === 200) {
  //       toast.success('Template saved successfully.');

  //       // Refresh list so new template appears / id updates
  //       const refreshed = await getWhatsappTemplates();
  //       const data = (refreshed.data as any)?.data;
  //       const apiTemplates: WhatsappTemplate[] = Array.isArray(data?.templates) ? data.templates : [];
  //       setTemplates(apiTemplates);

  //       const newTemplateId = (res.data as any)?.data?.template_id;
  //       const nextSelected =
  //         (typeof newTemplateId === 'number' && apiTemplates.find((t) => t.template_id === newTemplateId)) ||
  //         apiTemplates.find((t) => t.name === templateName) ||
  //         apiTemplates[0];

  //       if (nextSelected) {
  //         setSelectedTemplateId(nextSelected.template_id);
  //         setTemplateName(nextSelected.name || templateName);
  //         setTemplateContent(nextSelected.content || templateContent);
  //       }
  //     } else {
  //       toast.error('Failed to save template.');
  //     }
  //   } catch (e) {
  //     console.error(e);
  //     toast.error('Failed to save template.');
  //   } finally {
  //     setSaveLoading(false);
  //   }
  // };

  const handleSend = () => {
    if (!recipientNumber) {
      toast.error('Phone number not available for WhatsApp.');
      return;
    }
    if (!templateContent.trim()) {
      toast.error('Please enter template content.');
      return;
    }

    const finalMessage = formatWhatsappMessage(templateContent);

    const url = `https://api.whatsapp.com/send/?phone=${recipientNumber}&text=${encodeMessage(finalMessage)}`;
    window.open(url, '_blank');
  };

  const hasHrId = false;

  return (
    <div id="ext-whatsapp-modal-root" className="ext-whatsapp-scope">
      <div className="ReactModal__Overlay" onClick={handleClose}>
        <div
          className="ReactModal__Content commanModalPopup sendEmailSequenceModal sendWhatsappModal react-modal-portal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="commanModalHeader">
            <div className="commanModalAction">
              <span className="modal-close-btn" onClick={handleClose} title="Close">
                <X size={20} />
              </span>
            </div>

            <div className="previewModalTitle">
              <h2>Send WhatsApp</h2>
              <ul className="addNoteHeadFetList">
                {recipientName && <li>{recipientName}</li>}
                <li>
                  <Phone size={16} />
                  <span>{recipientNumber || talent?.contact_number || 'Not available'}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="modal-container" id="scrollContainer">
            <div className="emailBoxWarp">
              <div className="emailBoxHead openEmailBox">
                <h3>Compose Template</h3>
              </div>

              <div className="emailBoxBody">
                <div className="chooseEmailTemp">
                  <div className="form-group mb-0">
                    <label>
                      Choose template<span> *</span>
                    </label>
                    <div className="selectEmailTemp">
                      <select
                        className="form-control"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : '')}
                        disabled={templatesLoading}
                      >
                        <option value="">{templatesLoading ? 'Loading templates...' : 'Select a template'}</option>
                        {templates.map((t) => {
                          const disabled = Boolean(t.hr_required) && !hasHrId;
                          return (
                            <option key={t.template_id} value={t.template_id} disabled={disabled}>
                              {t.name}
                            </option>
                          );
                        })}
                      </select>
                      {/* <div className="helpText">Some templates may be disabled if HR is required.</div> */}
                    </div>
                  </div>
                </div>

                <div className="emailBoxBodyInner">
                  <div className="form-group">
                    <label>
                      Template Name <span>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type here..."
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div className="emailTempHead">
                      <label>
                        Template Content <span>*</span>
                      </label>
                      {/* Preview functionality commented out
                      <div className="addActionBtn">
                        <button
                          type="button"
                          className="addBtn"
                          onClick={() => void handlePreview(true)}
                          disabled={previewLoading || templatesLoading}
                        >
                          <Eye size={16} />
                          <span>{previewLoading ? 'Previewing...' : 'Preview'}</span>
                        </button>
                      </div>
                      */}
                    </div>

                    <RichEmailEditor
                      className="ext-wysiwyg"
                      placeholder="Type here..."
                      value={templateContent}
                      onChange={(value) => setTemplateContent(value)}
                      scrollingContainer="#scrollContainer"
                      dynamicFields={dynamicFields}
                      showDynamicDropdowns={false}
                      templateAppliedAt={templateAppliedAt}
                      isWhatsapp={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="commanModalFooter modalFooterAction">
            {/* Save / Update template functionality commented out
            <div className="modalActionBtn">
              <button
                className="btnPrimary brdBtnPrimary"
                type="button"
                onClick={() => void handleSaveTemplate(false)}
                disabled={saveLoading}
              >
                <Save size={16} />
                <span>{saveLoading ? 'Saving...' : 'Save New'}</span>
              </button>
              <button
                className="btnPrimary brdBtnPrimary"
                type="button"
                onClick={() => void handleSaveTemplate(true)}
                disabled={saveLoading || !selectedTemplate}
              >
                <span>{saveLoading ? 'Saving...' : 'Update'}</span>
              </button>
            </div>
            */}

            <div className="modalActionBtn">
              <button className="backBtn" type="button" onClick={handleClose}>
                Cancel
              </button>
              <div className="sendEmailNowAction">
                <button className="btnPrimary" type="button" onClick={() => void handleSend()}>
                  Send Message
                </button>
              </div>
            </div>
          </div>

          {/* Preview modal commented out
          {previewModalOpen && previewHtml && (
            <div className="ext-preview-modal-layer" onClick={() => setPreviewModalOpen(false)}>
              <div className="ext-preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="commanModalHeader">
                  <span className="modalCloseBtn" title="Close" onClick={() => setPreviewModalOpen(false)}>
                    <X size={20} />
                  </span>
                  <div className="previewModalTitle">
                    <h2>Preview WhatsApp Message</h2>
                  </div>
                </div>
                <div className="modal-container sendEmailModal">
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
                <div className="commanModalFooter">
                  <button className="backBtn" type="button" onClick={() => setPreviewModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          */}
        </div>
      </div>
    </div>
  );
};

export default WhatsappModal;

