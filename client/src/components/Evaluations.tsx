import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import ClassService from '../services/ClassService';
import EnrollmentService from '../services/EnrollmentService';

import { ImportGradeComponent } from './ImportGrade';

interface EvaluationsProps {
  onError: (errorMessage: string) => void;
}

const Evaluations: React.FC<EvaluationsProps> = ({ onError }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    // Load previously selected class from localStorage
    return localStorage.getItem('evaluations-selected-class') || '';
  });
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledGoal, setScheduledGoal] = useState("");
  const [days, setDays] = useState<number | "">(0);
  const [hours, setHours] = useState<number | "">(0);
  const [minutes, setMinutes] = useState<number | "">(0);
  const [seconds, setSeconds] = useState<number | "">(0);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

  // Predefined evaluation goals
  const evaluationGoals = [
    'Requirements',
    'Configuration Management', 
    'Project Management',
    'Design',
    'Tests',
    'Refactoring'
  ];

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const classesData = await ClassService.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      onError(`Failed to load classes: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Load all classes on component mount
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Update selected class when selectedClassId changes
  useEffect(() => {
    if (selectedClassId) {
      const classObj = classes.find(c => c.id === selectedClassId);
      setSelectedClass(classObj || null);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, classes]);


  // Calculate scheduled date whenever time inputs change
  useEffect(() => {
  const d = Number(days) || 0;
  const h = Number(hours) || 0;
  const m = Number(minutes) || 0;
  const s = Number(seconds) || 0;

  const totalMs = ((d * 24 + h) * 60 + m) * 60 * 1000 + s * 1000;

  if (totalMs > 0) {
    setScheduledDate(new Date(Date.now() + totalMs));
  } else {
    setScheduledDate(null);
  }
}, [days, hours, minutes, seconds]);


  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);
  
  const openModal = (title: string, message: string) => {
      setModal({ title, message });
  };
  
  const closeModal = () => {
      setModal(null);
  };

  const handleClassSelection = (classId: string) => {
    setSelectedClassId(classId);
    // Save selected class to localStorage for persistence
    if (classId) {
      localStorage.setItem('evaluations-selected-class', classId);
    } else {
      localStorage.removeItem('evaluations-selected-class');
    }
  };

  const handleEvaluationChange = async (studentCPF: string, goal: string, grade: string) => {
    if (!selectedClass) {
      onError('No class selected');
      return;
    }

    try {
      await EnrollmentService.updateEvaluation(selectedClass.id, studentCPF, goal, grade);
      // Reload classes to get updated enrollment data
      await loadClasses();
    } catch (error) {
      onError(`Failed to update evaluation: ${(error as Error).message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="evaluation-section">
        <h3>Evaluations</h3>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading classes...
        </div>
      </div>
    );
  }

return (
  <div className="evaluation-section">
      <h3>Evaluations</h3>
      
      {/* Class Selection */}
      <div className="class-selection-container">
        <label htmlFor="classSelect">Select Class:</label>
        <select
          id="classSelect"
          value={selectedClassId}
          onChange={(e) => handleClassSelection(e.target.value)}
          className="class-select"
        >
          <option value="">-- Select a class --</option>
          {classes.map((classObj) => (
            <option key={classObj.id} value={classObj.id}>
              {classObj.topic} ({classObj.year}/{classObj.semester})
            </option>
          ))}
        </select>
      </div>

      {!selectedClass && (
        <div style={{ 
          padding: '20px', 
          border: '2px dashed #ccc', 
          borderRadius: '8px', 
          textAlign: 'center',
          color: '#666',
          marginTop: '20px'
        }}>
          <h4>No Class Selected</h4>
          <p>Please select a class to view and manage evaluations.</p>
        </div>
      )}

      {selectedClass && selectedClass.enrollments.length === 0 && (
        <div style={{ 
          padding: '20px', 
          border: '2px dashed #ccc', 
          borderRadius: '8px', 
          textAlign: 'center',
          color: '#666',
          marginTop: '20px'
        }}>
          <h4>No Students Enrolled</h4>
          <p>This class has no enrolled students yet.</p>
          <p>Add students in the Students tab first.</p>
        </div>
      )}

      {selectedClass && selectedClass.enrollments.length > 0 && (<>
        <div className="evaluation-table-container">
          {/*Componente de importacao de notas de uma planilha, vai reagir as mudacas do classId */}
          <div>
            <ImportGradeComponent classID={selectedClassId} />
          </div>
          <h4>{selectedClass.topic} ({selectedClass.year}/{selectedClass.semester})</h4>
          
          <div className="evaluation-matrix">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th className="student-name-header">Student</th>
                  {evaluationGoals.map(goal => (
                    <th key={goal} className="goal-header">{goal}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedClass.enrollments.map(enrollment => {
                  const student = enrollment.student;
                  
                  // Create a map of evaluations for quick lookup
                  const studentEvaluations = enrollment.evaluations.reduce((acc, evaluation) => {
                    acc[evaluation.goal] = evaluation.grade;
                    return acc;
                  }, {} as {[goal: string]: string});

                  return (
                    <tr key={student.cpf} className="student-row">
                      <td className="student-name-cell">{student.name}</td>
                      {evaluationGoals.map(goal => {
                        const currentGrade = studentEvaluations[goal] || '';
                        
                        return (
                          <td key={goal} className="evaluation-cell">
                            <select
                              value={currentGrade}
                              onChange={(e) => handleEvaluationChange(student.cpf, goal, e.target.value)}
                              className={`evaluation-select ${currentGrade ? `grade-${currentGrade.toLowerCase()}` : ''}`}
                            >
                              <option value="">-</option>
                              <option value="MANA">MANA</option>
                              <option value="MPA">MPA</option>
                              <option value="MA">MA</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
        {/* BOTÃO AGENDAR */}
        <button
          className="SelfEvaluation-button-scheduler"
          onClick={() => setShowScheduler(true)}
        >
          Agendar solicitação
        </button>

        {/* SCHEDULER */}
        {showScheduler && (
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "#f9f9f9",
            }}
          >
            <h3>Agendar solicitação de autoavaliação</h3>

            <label>Meta:</label>
            <select
              className="SelfEvaluation-selection"
              style={{ marginLeft: "10px" }}
              value={scheduledGoal}
              onChange={(e) => setScheduledGoal(e.target.value)}
            >
              <option value="">Selecione uma meta</option>
              {evaluationGoals.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>

            <div style={{ marginTop: "10px" }}>
              <label>Dias:</label>
              <input className="SelfEvaluation-input-scheduler"
                type="number"
                min="0"
                value={days}
                onChange={(e) =>
                  setDays(e.target.value === "" ? "" : Number(e.target.value))
                }
              />

              <input className="SelfEvaluation-input-scheduler"
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) =>
                  setHours(e.target.value === "" ? "" : Number(e.target.value))
                }
              />

              <input className="SelfEvaluation-input-scheduler"
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) =>
                  setMinutes(e.target.value === "" ? "" : Number(e.target.value))
                }
              />

              <input className="SelfEvaluation-input-scheduler"
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) =>
                  setSeconds(e.target.value === "" ? "" : Number(e.target.value))
                }
              />

              {scheduledDate && (
                <p style={{ marginTop: "10px", fontWeight: "bold" }}>
                  A solicitação será enviada em:
                  {scheduledDate.toLocaleString()}
                </p>
              )}

              <button
                className="SelfEvaluation-button-send-scheduler"
                onClick={() => {
                  openModal(
                    "Sucesso!",
                    `Agendamento do Pedido de autoavaliação para a turma: ${selectedClass.topic}, na meta: ${scheduledGoal} Feito com sucesso`
                  );
                }}
              >
                Agendar solicitação de autoavaliação
              </button>
            </div>
          </div>
        )}

        {/* TABELA DE ENVIO */}
        <table className="students-list" style={{ marginTop: "20px" }}>
          <thead>
            <tr>
              <th className="student-name-header">Student</th>
              {evaluationGoals.map((goal) => (
                <th key={goal} className="goal-header">
                  {goal}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Envio geral */}
            <tr style={{ background: "#eef2ff" }}>
              <td style={{ fontWeight: "bold" }}>Envio Geral</td>

              {evaluationGoals.map((goal) => (
                <td key={goal}>
                  <button
                    onClick={() =>
                      EnrollmentService.requestSelfEvaluationAll(
                        selectedClass.id,
                        goal
                      )
                        .then(() => {
                          openModal(
                            "Sucesso!",
                            `Pedido de autoavaliação solicitado para a turma: ${selectedClass.topic}, na meta: ${goal}`
                          );
                          loadClasses();
                        })
                        .catch((err) => onError(err.message))
                    }
                  >
                    Enviar para todos
                  </button>
                </td>
              ))}
            </tr>

            {/* Cada aluno */}
            {selectedClass.enrollments?.map((enr) => (
              <tr key={enr.student.cpf}>
                <td>{enr.student.name}</td>

                {evaluationGoals.map((goal) => (
                  <td key={goal}>
                    <button
                      onClick={() =>
                        EnrollmentService.requestSelfEvaluation(
                          selectedClass.id,
                          enr.student.cpf,
                          goal
                        )
                          .then(() => {
                            openModal(
                              "Sucesso!",
                              `Pedido de autoavaliação solicitado para o aluno: ${enr.student.name}, na meta: ${goal}`
                            );
                            loadClasses();
                          })
                          .catch((err) => onError(err.message))
                      }
                    >
                      Enviar
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}

    {/* MODAL */}
    {modal && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>{modal.title}</h3>
          <p>{modal.message}</p>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={closeModal}
              style={{ padding: "8px 16px", cursor: "pointer" }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
export default Evaluations;