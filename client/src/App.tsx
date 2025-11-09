import React, { useState, useEffect } from 'react';
import { Student } from './types/Student';
import { Class } from './types/Class';
import { studentService } from './services/StudentService';
import ClassService from './services/ClassService';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import Evaluations from './components/Evaluations';
import Classes from './components/Classes';
import './App.css';

type TabType = 'students' | 'evaluations' | 'classes';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('students');

  // Load students and classes on component mount
  useEffect(() => {
    loadStudents();
    loadClasses();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const studentsData = await studentService.getAllStudents();
      setStudents(studentsData);
    } catch (err) {
      setError('Failed to load students. Please try again.');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      setError('');
      const classesData = await ClassService.getAllClasses();
      setClasses(classesData);
    } catch (err) {
      setError('Failed to load classes. Please try again.');
      console.error('Error loading classes:', err);
    }
  };

  const handleStudentAdded = () => {
    loadStudents(); // Reload the list when a new student is added
  };

  const handleStudentDeleted = () => {
    loadStudents(); // Reload the list when a student is deleted
  };

  const handleStudentUpdated = () => {
    setEditingStudent(null);
    loadStudents(); // Reload the list when a student is updated
  };

  const handleClassAdded = () => {
    loadClasses(); // Reload classes when a new class is added
  };

  const handleClassUpdated = () => {
    loadClasses(); // Reload classes when a class is updated
  };

  const handleClassDeleted = () => {
    loadClasses(); // Reload classes when a class is deleted
    setSelectedClass(null); // Clear selection if deleted class was selected
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Teaching Assistant React</h1>
        <p>Managing ESS student information</p>
      </header>

      <main className="App-main">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button
            className={`tab-button ${activeTab === 'evaluations' ? 'active' : ''}`}
            onClick={() => setActiveTab('evaluations')}
          >
            Evaluations
          </button>
          <button
            className={`tab-button ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Classes
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'students' && (
            <>
              {/* Class Selection */}
              <div className="class-selection">
                <label htmlFor="class-select">Filter by Class:</label>
                <select
                  id="class-select"
                  value={selectedClass ? `${selectedClass.topic}-${selectedClass.year}-${selectedClass.semester}` : ''}
                  onChange={(e) => {
                    const classId = e.target.value;
                    if (classId) {
                      const classObj = classes.find(c => `${c.topic}-${c.year}-${c.semester}` === classId);
                      setSelectedClass(classObj || null);
                    } else {
                      setSelectedClass(null);
                    }
                  }}
                  className="class-selector"
                >
                  <option value="">All Students</option>
                  {classes.map((classObj) => (
                    <option 
                      key={`${classObj.topic}-${classObj.year}-${classObj.semester}`}
                      value={`${classObj.topic}-${classObj.year}-${classObj.semester}`}
                    >
                      {classObj.topic} ({classObj.year}/{classObj.semester})
                    </option>
                  ))}
                </select>
              </div>

              <StudentForm
                onStudentAdded={handleStudentAdded}
                onStudentUpdated={handleStudentUpdated}
                onError={handleError}
                onCancel={editingStudent ? handleCancelEdit : undefined}
                editingStudent={editingStudent}
              />

              <StudentList
                students={selectedClass ? selectedClass.enrollments.map(e => e.student) : students}
                onStudentDeleted={handleStudentDeleted}
                onEditStudent={handleEditClick}
                onError={handleError}
                loading={loading}
              />
            </>
          )}

          {activeTab === 'evaluations' && (
            <Evaluations 
              students={selectedClass ? selectedClass.enrollments.map(e => e.student) : []} 
            />
          )}

          {activeTab === 'classes' && (
            <Classes
              classes={classes}
              onClassAdded={handleClassAdded}
              onClassUpdated={handleClassUpdated}
              onClassDeleted={handleClassDeleted}
              onError={handleError}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;