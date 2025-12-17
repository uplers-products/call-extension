import { POST } from './apiClient';
import { 
  API_INITIATE_PLIVO_CALL, 
  API_END_PLIVO_CALL, 
  API_RECORD_PLIVO_CALL,
  API_GET_TALENT_DETAILS
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
