import mongoose from "mongoose";
import Patient from "../models/patient.js";
import Doctor from "../models/doctor.js";
import cloudinary from "../utils/cloudinary.js";

// Helper: Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ------------------------------ CREATE PATIENT ----------------------------- */
const createPatient = async ({ req, userType }) => {
  const user = req.user;
  if (!user) throw { status: 401, message: "Not authenticated" };
  if (user.userType !== userType) throw { status: 403, message: `Only ${userType} accounts can create patients` };

  const { firstName, lastName, email, phone, dateOfBirth, medicalRecordNumber, doctorId, notes } = req.body;

  if (!firstName || !lastName) throw { status: 400, message: "Missing required fields" };
  if (!req.file || !req.file.buffer) throw { status: 400, message: "Patient avatar (passport) is required" };

  // Optional doctor lookup
  let doctor = null;
  if (userType === "doctor") {
    doctor = await Doctor.findOne({ user: user._id });
    if (!doctor) throw { status: 404, message: "Doctor profile not found" };
  }

  if (doctorId && !isValidObjectId(doctorId)) throw { status: 400, message: "Invalid doctor ID" };

  if (medicalRecordNumber) {
    const existingPatient = await Patient.findOne({ medicalRecordNumber });
    if (existingPatient) throw { status: 409, message: "Medical record number already exists" };
  }

  // Upload avatar from memory buffer
  const uploadFromBuffer = (buffer) =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "patients", upload_preset: "primehealth" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });

  const uploadResult = await uploadFromBuffer(req.file.buffer);

  const patient = new Patient({
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    medicalRecordNumber,
    doctorId: doctor?._id || doctorId || null,
    createdBy: user._id,
    createdByType: userType,
    notes,
    medicalRecords: [],
    profilePicture: {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    },
  });

  await patient.save();
  await patient.populate("doctorId");

  return patient;
};

/* ------------------------------ CREATE BY DOCTOR ----------------------------- */
export const createPatientByDoctor = async (req, res) => {
  try {
    const patient = await createPatient({ req, userType: "doctor" });
    res.status(201).json({ message: "Patient created successfully", patient });
  } catch (err) {
    console.error("[v2] Error creating patient by doctor:", err);
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};

/* --------------------------- CREATE BY ORGANIZATION -------------------------- */
export const createPatientByOrganization = async (req, res) => {
  try {
    const patient = await createPatient({ req, userType: "organization" });
    res.status(201).json({ message: "Patient created successfully", patient });
  } catch (err) {
    console.error("[v2] Error creating patient by organization:", err);
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};

/* ----------------------------- FETCHING FUNCTIONS ---------------------------- */
export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid patient ID" });

    const patient = await Patient.findById(id).populate("doctorId medicalRecords");
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    res.status(200).json(patient);
  } catch (error) {
    console.error("[v2] Error fetching patient:", error);
    res.status(500).json({ error: "Server error while fetching patient" });
  }
};

export const getPatientsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!isValidObjectId(doctorId)) return res.status(400).json({ error: "Invalid doctor ID" });

    const patients = await Patient.find({ doctorId }).populate("doctorId");
    res.status(200).json(patients);
  } catch (error) {
    console.error("[v2] Error fetching patients by doctor:", error);
    res.status(500).json({ error: "Server error while fetching patients" });
  }
};

/* ----------------------------- UPDATING PATIENT ----------------------------- */
export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid patient ID" });

    const patient = await Patient.findById(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    if (!patient.createdBy.equals(user._id)) return res.status(403).json({ error: "Not authorized" });

    const updated = await Patient.findByIdAndUpdate(id, req.body, { new: true }).populate("doctorId");
    res.status(200).json({ message: "Patient updated successfully", patient: updated });
  } catch (error) {
    console.error("[v2] Error updating patient:", error);
    res.status(500).json({ error: "Server error while updating patient" });
  }
};

/* ----------------------------- DELETE PATIENT ----------------------------- */
export const deletePatient = async (req, res) => {
  res.status(403).json({ error: "Patients cannot be deleted — only editable." });
};


/* --------------------------- FETCH ALL PATIENTS FOR USER --------------------------- */
export const getMyPatients = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    let filter = {};

    if (user.userType === "doctor") {
      // Find the doctor profile first
      const doctor = await Doctor.findOne({ user: user._id });
      if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

      filter = { doctorId: doctor._id };
    } else if (user.userType === "organization") {
      // Organization patients are those created by this organization user
      filter = { createdBy: user._id, createdByType: "organization" };
    } else {
      return res.status(403).json({ error: "Only doctors or organizations can fetch patients" });
    }

    const patients = await Patient.find(filter).populate("doctorId");
    res.status(200).json(patients);
  } catch (error) {
    console.error("[v2] Error fetching my patients:", error);
    res.status(500).json({ error: "Server error while fetching patients" });
  }
};
