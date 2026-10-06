# 🏋️ Gym Manager — Daily Usage Guide

A complete walkthrough for using the Gym Manager app day-to-day.

---

## 📑 Table of Contents

- [Starting the App](#-starting-the-app)
- [Logging In](#-logging-in)
- [For the Gym Owner (Admin)](#-for-the-gym-owner-admin)
  - [Register a New Member](#register-a-new-member)
  - [Push a Member to the Hikvision Device](#push-a-member-to-the-hikvision-device)
  - [Enroll a Fingerprint on the Device](#enroll-a-fingerprint-on-the-device)
  - [Mark a Member as Paid / Unpaid](#mark-a-member-as-paid--unpaid)
  - [Export Attendance (CSV)](#export-attendance-csv)
  - [Delete a Member](#delete-a-member)
- [For Trainers](#-for-trainers)
- [The Attendance Log](#-the-attendance-log)
- [Dashboard Statistics](#-dashboard-statistics)
- [Daily Routine Checklist](#-daily-routine-checklist)
- [Backups](#-backups)
- [Troubleshooting](#-troubleshooting)
- [Quick Reference Card](#-quick-reference-card)

---

## 🚀 Starting the App

The app is configured to start automatically when the gym PC boots up.

**If it's already running**, skip to [Logging In](#-logging-in).

**If you need to start it manually:**

1. Open `C:\GymManager\`
2. Double-click **`start-gym.bat`**
3. A black command window opens titled "Gym Manager"
4. Wait ~5 seconds
5. Your browser will open automatically to **http://localhost:3000**

> ⚠️ **Do not close the "Gym Manager" command window** while the gym is open. Closing it stops the app.

---

## 🔑 Logging In

Open **http://localhost:3000** in Chrome or Edge.

Enter your credentials:

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |
| **Trainer 1** | `trainer1` | `trainer123` |
| **Trainer 2** | `trainer2` | `trainer123` |

> 🔒 **Security tip:** Change these passwords in `server.js` before going live. Look for the `validUsers` object near the top of the file.

Click **Sign In**. You'll land on the Members page.

---

## 👑 For the Gym Owner (Admin)

### Register a New Member

1. Log in as **admin**
2. From the **Members** page, click **+ Add Member** (top right)
3. Fill in the modal:

   | Field | Notes |
   |---|---|
   | **Full Name** | Required. E.g., `Kasun Perera` |
   | **Phone Number** | Required. Auto-formats to `+94 XX XXX XXXX`. The `+94 ` prefix is pre-filled. |
   | **Employee ID** | Optional. Leave blank to auto-generate. **If you plan to enroll them on the device, remember this ID.** |
   | **Mark as paid member** | Toggle on if the member has paid |

4. Click **Save Member**
5. ✅ The member appears **instantly** in the list — no page refresh needed

---

### Push a Member to the Hikvision Device

Before you can enroll their fingerprint, the member's record must exist on the device.

1. Find the member in the Members table
2. Click **🔒 Register Biometric** in their row
3. A modal opens explaining the enrollment process
4. Click **📤 Push User to Device**
5. Wait for the green confirmation: **"✅ User created on device"**

Once pushed, the **Biometric** column shows a blue **"On Device"** badge.

> ❌ If you see a red error, check that the device is powered on and reachable. See [Troubleshooting](#-troubleshooting).

---

### Enroll a Fingerprint on the Device

> ⚠️ **Important:** Fingerprint enrollment **cannot** be done from the web app. The Hikvision DS-K1T804BMF only supports local enrollment on the device itself.

1. Walk to the Hikvision device
2. Tap the **Menu** icon on the device screen
3. Log in as **admin** (device password, not the app password)
4. Navigate to **User Management** → **All Users**
5. Find the member you just pushed (by their Employee ID or name)
6. Tap their name → **Register** → **Fingerprint**
7. Have the member place their finger on the sensor **3 times** as prompted
8. Save and exit

✅ Now when the member places their finger on the device, the door will open (if Paid) or stay closed (if Not Paid), based on their access group on the device.

---

### Mark a Member as Paid / Unpaid

On the **Members** page, each row has a **toggle switch** in the **Paid** column.

- **Green (right position)** → Paid
- **Red (left position)** → Not Paid

Click the toggle to flip it. The change saves instantly.

> 🎯 **Note:** This toggle updates the record in the app, but does **not** automatically change the member's access group on the Hikvision device. To control door access, you must also update their group on the device (or via iVMS-4200). See the device manual for access group configuration.

---

### Export Attendance (CSV)

Only **admin** can export.

1. Click **📋 Attendance** in the left sidebar
2. Click **⬇ Export CSV** (top right)
3. The file `attendance.csv` downloads to your `Downloads` folder
4. Open it in **Excel** or **Google Sheets**

The CSV contains: `ID, EmployeeNo, Name, Timestamp, Status`

---

### Delete a Member

Only **admin** can delete.

1. Go to the **Members** page
2. Click **🗑 Delete** in the member's row
3. Confirm the prompt
4. The row disappears immediately

> ⚠️ Deletion is **permanent**. Historical attendance records for that member remain in the Attendance log.

---

## 🧑‍🏫 For Trainers

Trainers have a **restricted view** — they can manage day-to-day operations but not destructive actions.

### Trainers **can:**

- ✅ View all members
- ✅ View the attendance log
- ✅ Add new members
- ✅ Toggle paid status
- ✅ Push users to the Hikvision device
- ✅ Register biometrics

### Trainers **cannot:**

- ❌ Delete members
- ❌ Export the attendance CSV

The delete button and export button are simply hidden from their view.

---

## 📋 The Attendance Log

Every time a member scans their fingerprint on the Hikvision device, the event is pushed to the app in **real time**.

**To view the log:**

1. Click **📋 Attendance** in the sidebar
2. Records appear newest-first
3. Each row shows: **Name**, **Employee ID**, **Date & Time**, **Status**

| Status badge | Meaning |
|---|---|
| 🟢 **Granted** | The device allowed access (door opened) |
| 🔴 **Denied** | The device refused access (door stayed closed) |

> 🕐 **Real-time updates:** The attendance list refreshes when you reload the page or navigate to the tab. New events appear immediately.

---

## 📊 Dashboard Statistics

Four cards at the top of every page give you an at-a-glance view:

| Card | Shows |
|---|---|
| **Total Members** | All registered members in the system |
| **Paid** | Members currently marked as paid |
| **Not Paid** | Members currently marked as unpaid |
| **Today's Check-ins** | Fingerprint scans recorded today |

These update automatically whenever data changes.

---

## ⏰ Daily Routine Checklist

A short daily routine for the gym owner or manager:

### 🌅 Morning (Opening)

- [ ] Confirm the "Gym Manager" window is running (it auto-starts on boot)
- [ ] Open http://localhost:3000 and confirm the dashboard loads
- [ ] Check that the Hikvision device is powered on and connected

### 🌆 Evening (Closing)

- [ ] Review the day's attendance in the **Attendance** tab
- [ ] Mark any newly paid members using the toggle
- [ ] (Optional) Export the day's CSV for records

### 📅 Weekly

- [ ] Back up `C:\GymManager\data.json` to a USB stick or cloud folder
- [ ] Review members whose paid status needs updating
- [ ] Check for any "Unknown" entries in the attendance log (these mean the device sent an employee ID not registered in the app)

---

## 💾 Backups

**Everything the app stores lives in one file:**
