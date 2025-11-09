import React from 'react';
import { Student } from '../types/Student';

interface EvaluationsProps {
  students: Student[];
}

const Evaluations: React.FC<EvaluationsProps> = ({ students }) => {
  return (
    <div className="evaluation-section">
      <h3>Evaluations</h3>
      <div style={{ 
        padding: '20px', 
        border: '2px dashed #ccc', 
        borderRadius: '8px', 
        textAlign: 'center',
        color: '#666'
      }}>
        <h4>Evaluations System Under Development</h4>
        <p>Evaluations will be managed through class enrollments.</p>
        <p>Please use the Classes tab to create classes and enroll students.</p>
        <p>Individual evaluations will be available once the enrollment system is complete.</p>
      </div>
    </div>
  );
};

export default Evaluations;