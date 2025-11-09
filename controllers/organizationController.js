import Organization from "../models/organisation.js"
import Doctor from "../models/doctor.js"
import Staff from "../models/staff.js"
import User from "../models/user.js"

// ✅ Get organization by ID with populated doctors
const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params

    const organization = await Organization.findById(id).populate({
      path: "doctors",
      select: "firstName lastName specialization email phone licenseNumber",
    })

    if (!organization) {
      return res.status(404).json({ error: "Organization not found" })
    }

    res.status(200).json(organization)
  } catch (error) {
    console.error("[v0] Error fetching organization:", error)
    res.status(500).json({
      error: "Server error while fetching organization",
    })
  }
}

// ✅ Search organizations by name, type, or city
const searchOrganizations = async (req, res) => {
  try {
    const { query } = req.query

    const searchFilter = {
      $or: [
        { name: { $regex: query || "", $options: "i" } },
        { type: { $regex: query || "", $options: "i" } },
        { city: { $regex: query || "", $options: "i" } },
      ],
    }

    const organizations = await Organization.find(searchFilter).select(
      "name type city country phone email"
    )

    res.status(200).json(organizations)
  } catch (error) {
    console.error("[v0] Error searching organizations:", error)
    res.status(500).json({
      error: "Server error while searching organizations",
    })
  }
}

// ✅ Get doctors in an organization
const getOrganizationDoctors = async (req, res) => {
  try {
    const { organizationId } = req.params

    const doctors = await Doctor.find({
      organizations: organizationId,
    }).select("firstName lastName specialization email phone licenseNumber")

    res.status(200).json(doctors)
  } catch (error) {
    console.error("[v0] Error fetching organization doctors:", error)
    res.status(500).json({
      error: "Server error while fetching doctors",
    })
  }
}

// ✅ Get all staff in organization
const getOrganizationStaff = async (req, res) => {
  try {
    const { organizationId } = req.params

    const staff = await Staff.find({ organizationId })
      .select(
        "firstName lastName email phoneNumber role staffType department status dateJoined"
      )
      .sort({ dateJoined: -1 })

    res.status(200).json(staff)
  } catch (error) {
    console.error("[v0] Error fetching organization staff:", error)
    res.status(500).json({
      error: "Server error while fetching staff",
    })
  }
}

// ✅ Initialize (Add) a new staff under an organization
const initializeStaff = async (req, res) => {
  try {
    const { organizationId } = req.params
    const {
      branchId,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      email,
      phoneNumber,
      address,
      city,
      state,
      country,
      staffType,
      role,
      specialization,
      licenseNumber,
      department,
      employmentType,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      insuranceProvider,
      insuranceNumber,
      createdBy,
    } = req.body

    // 🔹 Validate required fields
    if (
      !organizationId ||
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !role ||
      !staffType
    ) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // 🔹 Ensure organization exists
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" })
    }

    // 🔹 Check for duplicates
    const existingEmail = await Staff.findOne({
      email: email.toLowerCase(),
    })
    if (existingEmail) {
      return res.status(409).json({
        error: "Staff with this email already exists",
        field: "email",
      })
    }

    const existingPhone = await Staff.findOne({ phoneNumber })
    if (existingPhone) {
      return res.status(409).json({
        error: "Staff with this phone number already exists",
        field: "phoneNumber",
      })
    }

    // 🔹 Create linked User account
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phoneNumber,
      role: "staff",
      organizationId,
    })

    // 🔹 Create Staff record
    const staff = await Staff.create({
      organizationId,
      branchId,
      userId: user._id,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      email: email.toLowerCase(),
      phoneNumber,
      address,
      city,
      state,
      country,
      staffType,
      role,
      specialization,
      licenseNumber,
      department,
      employmentType,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      insuranceProvider,
      insuranceNumber,
      createdBy,
    })

    console.log("[v0] Staff created successfully:", staff._id)

    res.status(201).json({
      message: "Staff initialized successfully",
      staff: {
        _id: staff._id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phoneNumber: staff.phoneNumber,
        role: staff.role,
        staffType: staff.staffType,
        department: staff.department,
        status: staff.status,
        dateJoined: staff.dateJoined,
      },
    })
  } catch (error) {
    console.error("[v0] Error initializing staff:", error.message)

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(409).json({
        error: `Staff with this ${field} already exists`,
        field,
      })
    }

    res.status(500).json({ error: "Server error while initializing staff" })
  }
}

// ✅ Update staff
const updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params
    const updates = req.body

    const staff = await Staff.findByIdAndUpdate(staffId, updates, {
      new: true,
      runValidators: true,
    })

    if (!staff) {
      return res.status(404).json({ error: "Staff not found" })
    }

    res.status(200).json({
      message: "Staff updated successfully",
      staff,
    })
  } catch (error) {
    console.error("[v0] Error updating staff:", error)
    res.status(500).json({ error: "Server error while updating staff" })
  }
}

// ✅ Delete staff
const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params

    const staff = await Staff.findByIdAndDelete(staffId)

    if (!staff) {
      return res.status(404).json({ error: "Staff not found" })
    }

    // Also delete associated user if needed
    await User.findByIdAndDelete(staff.userId)

    res.status(200).json({
      message: "Staff deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Error deleting staff:", error)
    res.status(500).json({ error: "Server error while deleting staff" })
  }
}

export {
  getOrganizationById,
  searchOrganizations,
  getOrganizationDoctors,
  getOrganizationStaff,
  initializeStaff,
  updateStaff,
  deleteStaff,
}
