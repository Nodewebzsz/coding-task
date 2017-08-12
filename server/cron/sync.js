const { getTeams, getTeamProjects, getProjectTasks } = require('../lib/api');
const { model: { User, Team, Project, Task, Label, TaskLabels } } = require('../model');

// eslint-disable-next-line camelcase
const updateLabels = (task_id, labels) => {
  labels.forEach(async (label) => {
    await Label.upsert(label);
    await TaskLabels.upsert({ task_id, label_id: label.id });
  });
  return true;
};

const updateTasks = (tasks) => {
  tasks.forEach(async (task) => {
    updateLabels(task.id, task.labels);
    /* eslint-disable no-param-reassign */
    delete task.labels;
    const owner = task.owner;
    await User.upsert(owner);
    delete task.owner;
    let deadline = 0;
    if (task.deadline) {
      deadline = new Date(`${new Date(task.deadline).toLocaleDateString()} 22:00:00`).getTime();
    }
    await Task.upsert(Object.assign(task, { owner_id: owner.id, deadline }));
  });
  return true;
};

const updateProjects = (projects, team = '') => {
  projects.forEach(async (project) => {
    await Project.upsert(project);
    const tasks = await getProjectTasks({ team, project: project.name });
    updateTasks(tasks.list);
  });
  return true;
};

const updateTeams = (teams) => {
  teams.forEach(async (team) => {
    const owner = team.owner;
    await User.upsert(owner);
    // eslint-disable-next-line no-param-reassign
    delete team.owner;
    await Team.upsert(Object.assign(team, { owner_id: owner.id }));
    const projects = await getTeamProjects({ team: team.global_key });
    updateProjects(projects, team.global_key);
  });
  return true;
};

module.exports = async () => {
  const teams = await getTeams();
  updateTeams(teams);
  return true;
};