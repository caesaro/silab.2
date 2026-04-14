export interface Student {
  name: string;
  nim: string;
}

export interface ObservationData {
  recipientName: string;
  companyName: string;
  companyAddress: string;
  courseName: string;
  lecturerName: string;
  lecturerNidn: string;
  headOfProgramName: string;
  headOfProgramNidn: string;
  students: Student[];
}

export interface ActiveStudentRequest {
  id: string;
  name: string;
  nim: string;
  email: string;
  transcriptBase64: string;
  transcriptName: string;
  status: 'pending' | 'verified' | 'sent';
  createdAt: string;
  signatureBase64?: string;
  stampBase64?: string;
}
