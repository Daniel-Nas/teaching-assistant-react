import React, { useState, useEffect, useCallback } from 'react';
import EnrollmentService from '../services/EnrollmentService';
import InfoButton from './InfoButton';
import ClassService from '../services/ClassService';
import { Class } from '../types/Class';
import { ImportGradeComponent } from './ImportGrade';

// Evaluation goals
const EVALUATION_GOALS = [
  'Requirements',
  'Configuration Management',
  'Project Management',
  'Design',
  'Tests',
  'Refactoring'
] as const;

interface EvaluationsProps {
  onError: (errorMessage: string) => void;
}

type ViewMode = 'evaluations' | 'self-evaluations' | 'comparison';

const Evaluations: React.FC<EvaluationsProps> = ({ onError }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('evaluations');

  // Class management state (from useClasses hook)
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledGoal, setScheduledGoal] = useState("");
  const [days, setDays] = useState<number | "">(0);
  const [hours, setHours] = useState<number | "">(0);
  const [minutes, setMinutes] = useState<number | "">(0);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

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

  // Update selected class when selectedClassId or classes change
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

  const totalMs = ((d * 24 + h) * 60 + m) * 60 * 1000;

  if (totalMs > 0) {
    setScheduledDate(new Date(Date.now() + totalMs));
  } else {
    setScheduledDate(null);
  }
}, [days, hours, minutes]);


  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);
  
  const openModal = (title: string, message: string) => {
      setModal({ title, message });
  };
  
  const closeModal = () => {
      setModal(null);
  };

  const handleClassSelection = (classId: string) => {
    setSelectedClassId(classId);
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

  const getDiscrepancyClass = (evaluation: string | undefined, selfEvaluation: string | undefined): string => {
    if (!evaluation || !selfEvaluation) return '';
    if (evaluation === selfEvaluation) return 'match';
    return 'discrepancy';
  };

  const compareGoal = (teacherEval: string | null | undefined, selfEval: string | null | undefined): boolean => {
    // Hierarquia das notas
    const hierarchy: Record<string, number> = { MA: 3, MPA: 2, MANA: 1 };

    const t = teacherEval && hierarchy[teacherEval] ? hierarchy[teacherEval] : null;
    const s = selfEval && hierarchy[selfEval] ? hierarchy[selfEval] : null;

    // Sem discrepância se qualquer nota estiver vazia ou inválida
    if (t === null || s === null) return false;

    return t < s;
  };

  const getStudentDiscrepancyInfo = (
    evaluationGoals: string[],
    studentEvaluations: Record<string, string>,
    studentSelfEvaluations: Record<string, string>
  ) => {
    let total = 0;
    let discrepant = 0;

    for (const goal of evaluationGoals) {
      const teacherEval = studentEvaluations[goal] || "";
      const selfEval = studentSelfEvaluations[goal] || "";

      if (teacherEval || selfEval) {
        total++;
        if (compareGoal(teacherEval, selfEval)) discrepant++;
      }
    }

    const percentage = total === 0 ? 0 : Math.round((discrepant / total) * 100);

    return {
      percentage,
      highlight: percentage > 25
    };
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

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setViewMode('evaluations')}
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: viewMode === 'evaluations' ? '#667eea' : '#e2e8f0',
                color: viewMode === 'evaluations' ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              Evaluations
            </button>
            <button
              onClick={() => setViewMode('self-evaluations')}
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: viewMode === 'self-evaluations' ? '#667eea' : '#e2e8f0',
                color: viewMode === 'self-evaluations' ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              Self-Evaluations
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: viewMode === 'comparison' ? '#667eea' : '#e2e8f0',
                color: viewMode === 'comparison' ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              Comparison
            </button>
          </div>

          {/* Evaluations View */}
          {viewMode === 'evaluations' && (
            <div className="evaluation-matrix">
              <table className="evaluation-table">
                <thead>
                  <tr>
                    <th className="student-name-header">Student</th>
                    {EVALUATION_GOALS.map(goal => (
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
                    }, {} as { [goal: string]: string });

                    return (
                      <tr key={student.cpf} className="student-row">
                        <td className="student-name-cell">{student.name}</td>
                        {EVALUATION_GOALS.map(goal => {
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
          )}

          {/* Self-Evaluations View */}
          {viewMode === 'self-evaluations' && (
            <div className="evaluation-matrix">
              <table className="evaluation-table">
                <thead>
                  <tr>
                    <th className="student-name-header">Student</th>
                    {EVALUATION_GOALS.map(goal => (
                      <th key={goal} className="goal-header">{goal}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.enrollments.map(enrollment => {
                    const student = enrollment.student;

                    // Create a map of self-evaluations for quick lookup
                    const studentEvaluations = enrollment.evaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    const studentSelfEvaluations = enrollment.selfEvaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    return (
                      <tr key={student.cpf} className="student-row">
                        <td className="student-name-cell">{student.name}</td>
                        {EVALUATION_GOALS.map(goal => {
                          const currentGrade = studentSelfEvaluations[goal] || '';
                          const evaluationGrade = studentEvaluations[goal] || '';
                          const hasDiscrepancy = compareGoal(evaluationGrade, currentGrade);
                          const getGradeStyle = (grade: string) => {
                            switch (grade) {
                              case 'MA':
                                return {
                                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MPA':
                                return {
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MANA':
                                return {
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              default:
                                return {
                                  backgroundColor: 'transparent',
                                  color: '#9ca3af'
                                };
                            }
                          };

                          return (
                            <td key={goal} className="evaluation-cell">
                              {hasDiscrepancy && (
                                  <InfoButton text={"Avaliação do professor foi " + evaluationGrade} />
                                )
                              }
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                ...getGradeStyle(currentGrade)
                              }}>
                                {currentGrade || '-'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Comparison View */}
          {viewMode === 'comparison' && (
            <div className="evaluation-matrix">
              <table className="evaluation-table" style={{ minWidth: '1000px' }}>
                <thead>
                  <tr>
                    <th className="student-name-header" style={{ width: '180px' }}>Student</th>
                    {EVALUATION_GOALS.map(goal => (
                      <th key={goal} className="goal-header" style={{ gridColumn: 'span 2' }} colSpan={2}>
                        {goal}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="goal-header" style={{ width: '180px' }}></th>
                    {EVALUATION_GOALS.map(goal => (
                      <React.Fragment key={`${goal}-header`}>
                        <th className="goal-header" style={{ width: '80px' }}>
                          Prof
                        </th>
                        <th className="goal-header" style={{ width: '80px' }}>
                          Self
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.enrollments.map(enrollment => {
                    const student = enrollment.student;

                    const studentEvaluations = enrollment.evaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    const studentSelfEvaluations = enrollment.selfEvaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    const { percentage, highlight } = getStudentDiscrepancyInfo(
                      EVALUATION_GOALS as unknown as string[],
                      studentEvaluations,
                      studentSelfEvaluations
                    );

                    return (
                      <tr key={student.cpf} className="student-row">
                        <td className="student-name-cell" style={{ width: '180px' }}>
                          {student.name}                          
                          {highlight && (
                            <InfoButton text={"Discrepância de " + percentage + "%"} />
                          )}
                        </td>
                        {EVALUATION_GOALS.map(goal => {
                          const evaluation = studentEvaluations[goal] || '';
                          const selfEvaluation = studentSelfEvaluations[goal] || '';
                          const discrepancyClass = getDiscrepancyClass(evaluation, selfEvaluation);
                          const hasDiscrepancy = compareGoal(evaluation, selfEvaluation);
                          const getGradeStyle = (grade: string) => {
                            switch (grade) {
                              case 'MA':
                                return {
                                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MPA':
                                return {
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MANA':
                                return {
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              default:
                                return {
                                  backgroundColor: 'transparent',
                                  color: '#9ca3af'
                                };
                            }
                          };

                          return (
                            <React.Fragment key={`${student.cpf}-${goal}`}>
                              <td style={{
                                padding: '8px',
                                textAlign: 'center',
                                border: '1px solid #cbd5e1',
                                backgroundColor: discrepancyClass === 'discrepancy' ? '#fef3c7' : (student.cpf.charCodeAt(0) % 2 === 0 ? '#f0f9ff' : '#ffffff'),
                                width: '80px'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem',
                                  ...getGradeStyle(evaluation)
                                }}>
                                  {evaluation || '-'}
                                </span>
                              </td>
                              <td style={{
                                padding: '8px',
                                textAlign: 'center',
                                border: '1px solid #cbd5e1',
                                backgroundColor: discrepancyClass === 'discrepancy' ? '#fef3c7' : (student.cpf.charCodeAt(0) % 2 === 0 ? '#f0f9ff' : '#ffffff'),
                                width: '80px'
                              }}>
                                {hasDiscrepancy && (
                                  <InfoButton text={"Nota Discrepante"} />
                                )}
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem',
                                  ...getGradeStyle(selfEvaluation)
                                }}>
                                  {selfEvaluation || '-'}
                                </span>
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <h1 style={{ marginTop: '20px' }}>Solicitação de autoavaliação</h1>
        {/* BOTÃO AGENDAR SOLICITAÇÃO*/}
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
            <h2>Agendar solicitação de autoavaliação</h2>

            <label>Meta:</label>
            <select
              className="SelfEvaluation-selection"
              style={{ marginLeft: "10px" }}
              value={scheduledGoal}
              onChange={(e) => setScheduledGoal(e.target.value)}
            >
              <option value="">Selecione uma meta</option>
              {EVALUATION_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>

            <div style={{ marginTop: "10px" }}>
              <label>Dias:Horas:Minutos</label>
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
              {scheduledDate && (
                <p style={{ marginTop: "10px", fontWeight: "bold" }}>
                  A solicitação será enviada em:
                  {scheduledDate.toLocaleString()}
                </p>
              )}
              <button
                className="SelfEvaluation-button-send-scheduler"
                onClick={async () => {

                  if (!selectedClass) {
                    openModal("Selecione uma turma antes de agendar.",'');
                    return;
                  }
                  else if (!scheduledGoal) {
                    openModal("Selecione uma meta.",'');
                    return;
                  }

                  else if (!scheduledDate) {
                    openModal("Informe um tempo válido para o agendamento.",'');
                    return;
                  }else{
                        const totalHours = ((Number(days) || 0) * 24) + (Number(hours) || 0) + ((Number(minutes) || 0) / 60);
                        try {
                          await EnrollmentService.scheduleOneTime(selectedClass.id, scheduledGoal, totalHours);

                          openModal(
                            "Sucesso!",
                            `Pedido de autoavaliação agendado para a turma: ${selectedClass.topic}, meta: ${scheduledGoal}. Envio em: ${scheduledDate.toLocaleString()}`
                          );

                          // fechar e resetar form
                          setShowScheduler(false);
                          setScheduledGoal("");
                          setDays(0);
                          setHours(0);
                          setMinutes(0);
                          setScheduledDate(null);

                          // atualizar classes se quiser
                          loadClasses();
                        } catch (err: any) {
                          onError(err.message || "Erro ao agendar");
                        }
                  }
                }}
              >
                Agendar solicitação de autoavaliação
              </button>
            </div>
          </div>
        )}
        <h2 >Envio imediato</h2>
        <table className="students-list" style={{ marginTop: "20px" }}>
          <thead>
            <tr>
              <th className="student-name-header">Student</th>
              {EVALUATION_GOALS.map((goal) => (
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

              {EVALUATION_GOALS.map((goal) => (
                <td key={goal}>
                  <button
                    onClick={async () =>
                      await EnrollmentService.requestSelfEvaluationAll(
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

                {EVALUATION_GOALS.map((goal) => (
                  <td key={goal}>
                    <button
                      onClick={async () =>
                        await EnrollmentService.requestSelfEvaluation(
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