import { BACKEND_URL } from "./backendConfig";

export interface FormField {
  id: string;
  label?: string;
  type?: string;
  required?: boolean;
}

export interface SendFormEmailParams {
  apiKey?: string;
  projectId?: string;
  to: string;
  subject: string;
  formState: Record<string, string>;
  from?: string;
}

/**
 * Validates form fields for required values and email format.
 */
export const validateForm = (fields: FormField[], formState: Record<string, string>) => {
  const validationErrors: string[] = [];
  let emailFieldValue = '';

  if (fields && fields.length > 0) {
    fields.forEach((field) => {
      const val = formState[field.label || field.id]?.trim();
      if (field.required && !val) {
        validationErrors.push(field.label || 'Required field');
      }
      if (field.type === 'email' || (field.label && field.label.toLowerCase().includes('email'))) {
        emailFieldValue = val;
      }
    });
  } else {
    // Default fields
    if (!formState['Name']?.trim()) validationErrors.push('Name');
    if (!formState['Email']?.trim()) validationErrors.push('Email');
    if (!formState['Message']?.trim()) validationErrors.push('Message');
    emailFieldValue = formState['Email']?.trim();
  }

  if (validationErrors.length > 0) {
    return { isValid: false, error: `Please fill in the following required fields: ${validationErrors.join(', ')}` };
  }

  if (emailFieldValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFieldValue)) {
      return { isValid: false, error: "Please enter a valid email address." };
    }
    if (!emailFieldValue.toLowerCase().endsWith('@gmail.com')) {
      return { isValid: false, error: "Only @gmail.com email addresses are allowed." };
    }
  }

  return { isValid: true };
};

/**
 * Generates the professional HTML template for the email.
 */
export const generateEmailHtml = (formState: Record<string, string>) => {
  const emailRows = Object.entries(formState)
    .map(([label, value]) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #4a5568; font-size: 14px; font-weight: 600; width: 30%; vertical-align: top;">${label}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: 14px; vertical-align: top;">${value}</td>
      </tr>
    `).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        <div style="background-color: #2563eb; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">New Form Submission</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4a5568; font-size: 16px; margin-top: 0; margin-bottom: 24px;">
            You have received a new message through the contact form on your website.
          </p>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th colspan="2" style="text-align: left; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; color: #1a202c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Submission Details</th>
              </tr>
            </thead>
            <tbody>
              ${emailRows}
            </tbody>
          </table>
          
          <div style="margin-top: 32px; padding: 20px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
            <p style="color: #1e40af; font-size: 14px; margin: 0;">
              <strong>Note:</strong> You can reply directly to this email if the sender provided their email address in the form.
            </p>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Sent via <strong>BuildX Designer</strong> Contact Form Integration
          </p>
        </div>
      </div>
    </div>
  `;
};


export const sendFormEmail = async (params: SendFormEmailParams) => {
  const { apiKey, projectId, to, subject, formState, from } = params;

  const senderEmail = 
    formState['Email'] || 
    Object.entries(formState).find(([k]) => k.toLowerCase().includes('email'))?.[1] || 
    '';
    
  const senderName = 
    formState['Name'] || 
    Object.entries(formState).find(([k]) => k.toLowerCase().includes('name'))?.[1] || 
    '';

  const displayFrom = senderName 
    ? `${senderName} (${senderEmail}) via Contact Form <onboarding@resend.dev>`
    : `${senderEmail} via Contact Form <onboarding@resend.dev>`;
  
  const response = await fetch(`${BACKEND_URL}/api/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resendApiKey: apiKey,
      projectId: projectId,
      to: to,
      subject: subject,
      from: displayFrom,
      replyTo: senderEmail,
      html: generateEmailHtml(formState),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send email');
  }

  return response.json();
};
