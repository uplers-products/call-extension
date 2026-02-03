import { POST } from './apiClient';
import { 
  API_INITIATE_PLIVO_CALL, 
  API_END_PLIVO_CALL, 
  API_RECORD_PLIVO_CALL,
  API_GET_TALENT_DETAILS,
  API_GET_WHATSAPP_TEMPLATES,
  API_WHATSAPP_PREVIEW_TEMPLATE,
  API_WHATSAPP_SAVE_TEMPLATE
} from '../constant/constant';
import type { 
  InitiateCallPayload, 
  RecordCallPayload, 
  EndCallPayload,
  InitiateCallResponse,
  FetchTalentDetailsPayload
} from '../types/common.types';

export const initiatePlivoCall = async (payload: InitiateCallPayload) => {
  try {
    return await POST<InitiateCallResponse>(API_INITIATE_PLIVO_CALL, payload);
  } catch (error) {
    console.error('Error initiating call:', error);
    throw error;
  }
};

export const recordPlivoCall = async (payload: RecordCallPayload) => {
  try {
    return await POST(API_RECORD_PLIVO_CALL, payload);
  } catch (error) {
    console.error('Error recording call:', error);
    throw error;
  }
};

export const endPlivoCall = async (payload: EndCallPayload) => {
  try {
    return await POST(API_END_PLIVO_CALL, payload);
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
};

export const fetchTalentDetails = async (payload: FetchTalentDetailsPayload) => {
  try {
    return await POST(API_GET_TALENT_DETAILS, payload);
  } catch (error) {
    console.error('Error fetching talent details:', error);
    throw error;
  }
};

// WhatsApp Templates
export const getWhatsappTemplates = async () => {
  try {
    return await POST(API_GET_WHATSAPP_TEMPLATES, {});
  } catch (error) {
    console.error('Error fetching whatsapp templates:', error);
    throw error;
  }
};

export const whatsappPreviewTemplate = async (payload: Record<string, unknown>) => {
  try {
    return await POST(API_WHATSAPP_PREVIEW_TEMPLATE, payload);
  } catch (error) {
    console.error('Error previewing whatsapp template:', error);
    throw error;
  }
};

export const whatsappSaveTemplate = async (payload: Record<string, unknown>) => {
  try {
    return await POST(API_WHATSAPP_SAVE_TEMPLATE, payload);
  } catch (error) {
    console.error('Error saving whatsapp template:', error);
    throw error;
  }
};
