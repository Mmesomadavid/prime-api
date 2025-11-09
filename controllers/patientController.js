import Patient from "../models/patient.js"
import Doctor from "../models/doctor.js"
import Organization from "../models/organisation.js"

// ✅ Create a new patient
export const createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      medicalRecordNumber,
      doctorId,
      organizationId,
      notes,
    } = req.body

    // Validate required fields
    if (!firstName || !lastName || !doctorId || !organizationId) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId)
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" })
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" })
    }

    // Verify doctor is tied to the organization
    if (!doctor.organizations.includes(organizationId)) {
      return res
        .status(403)
        .json({ error: "Doctor is not tied to this organization" })
    }

    // Check for duplicate medical record number
    if (medicalRecordNumber) {
      const existingPatient = await Patient.findOne({ medicalRecordNumber })
      if (existingPatient) {
        return res
          .status(409)
          .json({ error: "Medical record number already exists" })
      }
    }

    // Create new patient
    const patient = new Patient({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      medicalRecordNumber,
      doctorId,
      organizationId,
      notes,
    })

    await patient.save()

    // Populate doctor and organization for response
    await patient.populate("doctorId organizationId")

    res.status(201).json({ message: "Patient created successfully", patient })
  } catch (error) {
    console.error("[v0] Error creating patient:", error)
    res.status(500).json({ error: "Server error while creating patient" })
  }
}

// ✅ Get patient by ID
export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params

    const patient = await Patient.findById(id).populate("doctorId organizationId")

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    res.status(200).json(patient)
  } catch (error) {
    console.error("[v0] Error fetching patient:", error)
    res.status(500).json({ error: "Server error while fetching patient" })
  }
}

// ✅ Get all patients by doctor
export const getPatientsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params

    const patients = await Patient.find({ doctorId }).populate(
      "doctorId organizationId"
    )

    res.status(200).json(patients)
  } catch (error) {
    console.error("[v0] Error fetching patients by doctor:", error)
    res.status(500).json({ error: "Server error while fetching patients" })
  }
}

// ✅ Get all patients by organization
export const getPatientsByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params

    const patients = await Patient.find({ organizationId }).populate(
      "doctorId organizationId"
    )

    res.status(200).json(patients)
  } catch (error) {
    console.error("[v0] Error fetching patients by organization:", error)
    res.status(500).json({ error: "Server error while fetching patients" })
  }
}

// ✅ Update patient
export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params
    const { firstName, lastName, email, phone, dateOfBirth, notes } = req.body

    const patient = await Patient.findByIdAndUpdate(
      id,
      { firstName, lastName, email, phone, dateOfBirth, notes },
      { new: true }
    ).populate("doctorId organizationId")

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    res.status(200).json({ message: "Patient updated successfully", patient })
  } catch (error) {
    console.error("[v0] Error updating patient:", error)
    res.status(500).json({ error: "Server error while updating patient" })
  }
}

// ✅ Delete patient
export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params

    const patient = await Patient.findByIdAndDelete(id)

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    res.status(200).json({ message: "Patient deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting patient:", error)
    res.status(500).json({ error: "Server error while deleting patient" })
  }
}
