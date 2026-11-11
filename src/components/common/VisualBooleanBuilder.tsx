/**
 * LogicLab - Visual Boolean Builder (Compatibility Layer)
 * Wraps and delegates to the central ConstructorFuncionBooleana component.
 */

import React from 'react';
import {
  ConstructorFuncionBooleana,
  ConstructorFuncionBooleanaProps,
} from './ConstructorFuncionBooleana';

export interface VisualBooleanBuilderProps extends ConstructorFuncionBooleanaProps {}

export const VisualBooleanBuilder: React.FC<VisualBooleanBuilderProps> = (props) => {
  return <ConstructorFuncionBooleana {...props} />;
};

export default VisualBooleanBuilder;
