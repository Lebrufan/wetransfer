import { base44 } from './base44Client';


export const createPaymentIntent = base44.functions.createPaymentIntent;

export const generateBookingNumber = base44.functions.generateBookingNumber;

export const sendBookingEmail = base44.functions.sendBookingEmail;

export const refundPayment = base44.functions.refundPayment;

export const calculateDistance = base44.functions.calculateDistance;

export const calculateTransferPrice = base44.functions.calculateTransferPrice;

export const resendPaymentLink = base44.functions.resendPaymentLink;

export const changePassword = base44.functions.changePassword;

export const generateQuoteNumber = base44.functions.generateQuoteNumber;

export const submitQuoteRequest = base44.functions.submitQuoteRequest;

export const sendQuoteRequestEmails = base44.functions.sendQuoteRequestEmails;

export const createPaymentLinkForQuote = base44.functions.createPaymentLinkForQuote;

export const sendQuoteResponseEmail = base44.functions.sendQuoteResponseEmail;

export const placesAutocomplete = base44.functions.placesAutocomplete;

