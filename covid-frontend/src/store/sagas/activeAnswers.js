import { all, put, select, takeLatest } from 'redux-saga/effects';
import { message } from 'antd';
import * as api from 'store/sagas/api';
import * as globalSearchTypes from 'store/types/globalSearch';
import * as types from 'store/types/activeAnswers';
import * as actions from 'store/actions/activeAnswers';
const MODEL_ID = 1;

export function* get() {
  const { selectedValue } = yield select(state => state.globalSearch);

  // reset active answers and return if no question is selected
  if (!selectedValue) {
    yield put(actions.set([]));

    return;
  }

  yield put(actions.setLoadingStatus(true));
  try {
    const question = selectedValue;

    const query = {
      query: question,
      top_k_retriever: 5,
    };
    const data = yield api.post(`/query`, null, query);
    ///models/${MODEL_ID}/doc-qa

    const answers = data.answers
    yield put(actions.set(answers));

    // reset the feedbackGiven on each search
    yield put(actions.clearFeedbackGiven());

  } catch (error) {
    message.error(error.message);
  }
  yield put(actions.setLoadingStatus(false));
}

export function* markAsCorrectAnswer({ question, answerDocumentId }) {
  if (!question.selectedValue || answerDocumentId <= 0) {
    // do nothing
    return;
  }
  console.log(answerDocumentId)
  const id = parseInt(answerDocumentId, 10);
  try {
    const requestbody = {
      question:  question.selectedValue,
      answer: '',
      document_id: id,
      is_correct_answer: true,
      is_correct_document: true,
      model_id: 0,
      offset_start_in_doc: 0
    }
    yield api.post(`/feedback`, null, requestbody);
  } catch (error) {
    message.error(error.message);
  }

  yield put(actions.markAsFeedbackGiven({ [answerDocumentId]: 'relevant' }));
  message.success('Thanks for giving us feedback.')
}

export function* markAsWrongAnswer({ question, answerDocumentId, feedback }) {
  if (!question.selectedValue || answerDocumentId <= 0) {
    // do nothing
    return;
  }
  try {
    const id = parseInt(answerDocumentId, 10);

    const requestbody = {
      question:  question.selectedValue,
      answer: '',
      feedback,
      document_id: id
    }
    yield api.post(`/models/${MODEL_ID}/feedback`, null, requestbody);

  } catch (error) {
    message.error(error.message);
  }

  yield put(actions.markAsFeedbackGiven({ [answerDocumentId]: feedback }));

  // the popup did already say 'thank you'
  // message.success('Thanks for giving us feedback.')
}

export default function* () {
  yield all([
    takeLatest([types.GET, globalSearchTypes.SET_SELECTED_VALUE], get),
    takeLatest([types.MARK_AS_CORRECT_ANSWER], ({ payload }) => markAsCorrectAnswer(payload)),
    takeLatest([types.MARK_AS_WRONG_ANSWER], ({ payload }) => markAsWrongAnswer(payload)),
  ]);
}
