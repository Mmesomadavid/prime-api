import Doctor from "../models/doctor.js"
import Organization from "../models/organisation.js"

// ✅ Get doctors by organization
export const getDoctorsByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params

    // Verify organization exists
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" })
    }

    // Get doctors tied to this organization
    const doctors = await Doctor.find({ organizations: organizationId }).select(
      "firstName lastName licenseNumber specialization email phone"
    )

    res.status(200).json(doctors)
  } catch (error) {
    console.error("[v0] Error fetching doctors by organization:", error)
    res.status(500).json({ error: "Server error while fetching doctors" })
  }
}

// ✅ Search doctors (organization can search doctors tied to them)
export const searchDoctors = async (req, res) => {
  try {
    const { organizationId, query } = req.query

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" })
    }

    // Build search filter
    const searchFilter = {
      organizations: organizationId,
      $or: [
        { firstName: { $regex: query || "", $options: "i" } },
        { lastName: { $regex: query || "", $options: "i" } },
        { specialization: { $regex: query || "", $options: "i" } },
        { email: { $regex: query || "", $options: "i" } },
      ],
    }

    const doctors = await Doctor.find(searchFilter).select(
      "firstName lastName specialization email phone licenseNumber"
    )

    res.status(200).json(doctors)
  } catch (error) {
    console.error("[v0] Error searching doctors:", error)
    res.status(500).json({ error: "Server error while searching doctors" })
  }
}

// ✅ Get doctor's organizations
export const getDoctorOrganizations = async (req, res) => {
  try {
    const { doctorId } = req.params

    const doctor = await Doctor.findById(doctorId).populate("organizations")

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" })
    }

    res.status(200).json(doctor.organizations)
  } catch (error) {
    console.error("[v0] Error fetching doctor organizations:", error)
    res.status(500).json({ error: "Server error while fetching organizations" })
  }
}

// ✅ Assign doctor to organization
export const assignDoctorToOrganization = async (req, res) => {
  try {
    const { doctorId } = req.params
    const { organizationId } = req.body

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" })
    }

    const doctor = await Doctor.findById(doctorId)
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" })
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" })
    }

    // Check if already assigned
    if (doctor.organizations.includes(organizationId)) {
      return res.status(409).json({ error: "Doctor is already tied to this organization" })
    }

    // Enforce 3 organization limit
    if (doctor.organizations.length >= 3) {
      return res.status(400).json({
        error: "Doctor can only be tied to a maximum of 3 organizations",
      })
    }

    // Add organization
    doctor.organizations.push(organizationId)
    await doctor.save()

    res.status(200).json({ message: "Doctor assigned to organization successfully", doctor })
  } catch (error) {
    console.error("[v0] Error assigning doctor to organization:", error)
    res.status(500).json({ error: "Server error while assigning doctor" })
  }
}

// ✅ Remove doctor from organization
export const removeDoctorFromOrganization = async (req, res) => {
  try {
    const { doctorId } = req.params
    const { organizationId } = req.body

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" })
    }

    const doctor = await Doctor.findById(doctorId)
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" })
    }

    // Remove organization
    doctor.organizations = doctor.organizations.filter(
      (org) => org.toString() !== organizationId
    )
    await doctor.save()

    res.status(200).json({ message: "Doctor removed from organization successfully", doctor })
  } catch (error) {
    console.error("[v0] Error removing doctor from organization:", error)
    res.status(500).json({ error: "Server error while removing doctor" })
  }
}
